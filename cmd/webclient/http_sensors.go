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

		if app.DB != nil {
			if err := app.saveSensorToDatabase(f); err != nil {
				app.logger.Error("failed to save sensor to database", "error", err)
				// Continue without saving to DB? Or return error?
				// For now, return error
				return err
			}
		} else {
			app.logger.Warn("database not available, sensor configuration not persisted")
		}

		var newSensor sensors.BaseSensor
		// TODO: Refactor with switch case
		if f.Type == "GPS" || f.Type == "AIS" {
			//gpsAddr := fmt.Sprintf("%s:%d", f.Addr, f.Port)
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
		} else if f.Type == "Radar" {
			newSensor = sensors.NewRadarSensor(f, app.logger.With("logger", "radar"))
		} else {
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
		if updatedSensorModel.Type == "GPS" || updatedSensorModel.Type == "AIS" {
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
		} else if updatedSensorModel.Type == "Radar" {
			updatedSensor = sensors.NewRadarSensor(updatedSensorModel, app.logger.With("logger", "radar"))
			updatedSensor.(*sensors.RadarSensor).UID = uid

		} else {
			res.Status = 400
			return res.WriteString(fmt.Sprintf("unsupported sensor type: %s", updatedSensorModel.Type))
		}

		// Re-initialize and start the sensor
		app.sensors[sensorIdx] = updatedSensor
		updatedSensor.Initialize()
		go updatedSensor.Start(app.sensorCallback)

		if app.DB != nil {
			if err := app.saveSensorToDatabase(updatedSensorModel); err != nil {
				app.logger.Error("failed to update sensor in database", "error", err)
			}
		} else {
			app.logger.Warn("database not available, sensor configuration not persisted")
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
			if app.DB != nil {
				if err := app.deleteSensorFromDatabase(uid); err != nil {
					app.logger.Error("failed to delete sensor from database", "error", err)
					// Continue with deletion from memory even if DB deletion fails?
					// For now, continue
				}
			} else {
				app.logger.Warn("database not available, sensor configuration not deleted from persistence")
			}

			sensor := app.sensors[sensorIdx]
			sensor.Stop()
			app.sensors = append(app.sensors[:sensorIdx], app.sensors[sensorIdx+1:]...)
		}

		return res.WriteJSON(getSensors(app))
	}
}
