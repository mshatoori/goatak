package main

import (
	"encoding/json"
	"fmt"
	"slices"
	"time"

	"github.com/aofei/air"
	"github.com/google/uuid"
	"github.com/kdudkov/goatak/pkg/model"
	"github.com/kdudkov/goatak/pkg/sensors"
	"golang.org/x/net/context"
)

func getSensorsHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		return res.WriteJSON(getSensors(app))
	}
}

func addSensorHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		f := new(model.SensorModel)

		// TODO: Validation!

		if req.Body == nil {
			return nil
		}

		if err := json.NewDecoder(req.Body).Decode(f); err != nil {
			return err
		}

		if f.UID == "" {
			f.UID = uuid.New().String()
		}

		// Add sensor to config and save
		sensorConfig := SensorConfig{
			Title:    f.Title,
			UID:      f.UID,
			Addr:     f.Addr,
			Port:     f.Port,
			Type:     f.Type,
			Interval: f.Interval,
		}
		app.configManager.AddSensor(app.config, sensorConfig)

		// Save config to file
		if err := app.configManager.Save(*app.config); err != nil {
			app.logger.Error("failed to save sensor to config file", "error", err)
			return err
		}

		var newSensor sensors.BaseSensor
		switch f.Type {
		case "GPS":
			newSensor = &sensors.GpsdSensor{
				Addr:     fmt.Sprintf("%s:%d", f.Addr, f.Port),
				Conn:     nil,
				Logger:   app.logger.With("logger", "gpsd"),
				Reader:   nil,
				Type:     f.Type,
				UID:      f.UID,
				Interval: time.Second * time.Duration(f.Interval),
				Ctx:      context.Background(),
				Title:    f.Title,
			}
		case "Radar":
			newSensor = sensors.NewRadarSensor(f, app.logger.With("logger", "radar"))
		case "AIS":
			newSensor = sensors.NewAISSensor(f, app.logger.With("logger", "ais"))
		default:
			res.Status = 400
			return res.WriteString(fmt.Sprintf("unsupported sensor type: %s", f.Type))
		}

		app.sensors = append(app.sensors, newSensor)
		newSensor.Initialize()
		go newSensor.Start(app.sensorCallback)

		return res.WriteJSON(getSensors(app))
	}
}

func editSensorHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		uid := getStringParam(req, "uid")
		if uid == "" {
			res.Status = 400
			return res.WriteString("missing sensor UID")
		}

		updatedSensorModel := new(model.SensorModel)
		if req.Body == nil {
			res.Status = 400
			return res.WriteString("missing request body")
		}

		if err := json.NewDecoder(req.Body).Decode(updatedSensorModel); err != nil {
			return err
		}

		sensorIdx := slices.IndexFunc(app.sensors, func(sensor sensors.BaseSensor) bool {
			return sensor.GetUID() == uid
		})

		if sensorIdx == -1 {
			res.Status = 404
			return res.WriteString(fmt.Sprintf("sensor with UID %s not found", uid))
		}

		// Stop the existing sensor instance
		app.sensors[sensorIdx].Stop()

		// Update the sensor's configuration
		var updatedSensor sensors.BaseSensor
		switch updatedSensorModel.Type {
		case "GPS":
			updatedSensor = &sensors.GpsdSensor{
				Addr:     fmt.Sprintf("%s:%d", updatedSensorModel.Addr, updatedSensorModel.Port),
				Conn:     nil,
				Logger:   app.logger.With("logger", "gpsd"),
				Reader:   nil,
				Type:     updatedSensorModel.Type,
				UID:      updatedSensorModel.UID,
				Interval: time.Second * time.Duration(updatedSensorModel.Interval),
				Ctx:      context.Background(),
				Title:    updatedSensorModel.Title,
			}
		case "Radar":
			updatedSensor = sensors.NewRadarSensor(updatedSensorModel, app.logger.With("logger", "radar"))
			updatedSensor.(*sensors.RadarSensor).UID = uid
		case "AIS":
			updatedSensor = sensors.NewAISSensor(updatedSensorModel, app.logger.With("logger", "ais"))
			updatedSensor.(*sensors.AISSensor).UID = uid
		default:
			res.Status = 400
			return res.WriteString(fmt.Sprintf("unsupported sensor type: %s", updatedSensorModel.Type))
		}

		// Re-initialize and start the sensor
		app.sensors[sensorIdx] = updatedSensor
		updatedSensor.Initialize()
		go updatedSensor.Start(app.sensorCallback)

		// Update sensor in config and save
		sensorConfig := SensorConfig{
			Title:    updatedSensorModel.Title,
			UID:      updatedSensorModel.UID,
			Addr:     updatedSensorModel.Addr,
			Port:     updatedSensorModel.Port,
			Type:     updatedSensorModel.Type,
			Interval: updatedSensorModel.Interval,
		}
		app.configManager.UpdateSensor(app.config, uid, sensorConfig)

		// Save config to file
		if err := app.configManager.Save(*app.config); err != nil {
			app.logger.Error("failed to save updated sensor to config file", "error", err)
		}

		return res.WriteJSON(getSensors(app))
	}
}

func getSensors(app *App) []*model.SensorModel {
	sensorModels := make([]*model.SensorModel, 0)

	for _, s := range app.sensors {
		sensorModel := s.ToSensorModel()

		sensorModels = append(sensorModels, sensorModel)
	}

	return sensorModels
}

func deleteSensorHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		uid := getStringParam(req, "uid")

		sensorIdx := slices.IndexFunc(app.sensors, func(sensor sensors.BaseSensor) bool {
			return sensor.GetUID() == uid
		})

		if sensorIdx == -1 {
			res.Status = 404
		} else {
			// Remove sensor from config and save
			app.configManager.RemoveSensor(app.config, uid)

			// Save config to file
			if err := app.configManager.Save(*app.config); err != nil {
				app.logger.Error("failed to save sensor deletion to config file", "error", err)
			}

			sensor := app.sensors[sensorIdx]
			sensor.Stop()
			app.sensors = append(app.sensors[:sensorIdx], app.sensors[sensorIdx+1:]...)
		}

		return res.WriteJSON(getSensors(app))
	}
}
