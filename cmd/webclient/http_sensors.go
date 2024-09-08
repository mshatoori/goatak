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
		return res.WriteJSON(getSensors(app))
	}
}

func addSensorHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		f := new(model.SensorModel)

		// TODO: Validation!

		if req.Body == nil {
			return nil
		}

		if err := json.NewDecoder(req.Body).Decode(f); err != nil {
			return err
		}

		// TODO: Refactor with switch case
		if f.Type == "GPS" || f.Type == "AIS" {
			//gpsAddr := fmt.Sprintf("%s:%d", f.Addr, f.Port)
			var gpsdSensor = &sensors.GpsdSensor{
				Addr:     fmt.Sprintf("%s:%d", f.Addr, f.Port),
				Conn:     nil,
				Logger:   app.logger.With("logger", "gpsd"),
				Reader:   nil,
				Type:     f.Type,
				UID:      uuid.New().String(),
				Interval: time.Second * time.Duration(f.Interval),
				Ctx:      context.Background(),
				Title:    f.Title,
			}

			app.sensors = append(app.sensors, gpsdSensor)
			gpsdSensor.Initialize()
			go gpsdSensor.Start(app.sensorCallback)
		} else if f.Type == "Radar" {
			var radarSensor = sensors.NewRadarSensor(f, app.logger.With("logger", "radar"))

			app.sensors = append(app.sensors, radarSensor)
			radarSensor.Initialize()
			go radarSensor.Start(app.sensorCallback)
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
		uid := getStringParam(req, "uid")

		sensorIdx := slices.IndexFunc(app.sensors, func(sensor sensors.BaseSensor) bool {
			return sensor.GetUID() == uid
		})

		if sensorIdx == -1 {
			res.Status = 404
		} else {
			sensor := app.sensors[sensorIdx]
			sensor.Stop()
			app.sensors = append(app.sensors[:sensorIdx], app.sensors[sensorIdx+1:]...)
		}

		return res.WriteJSON(getSensors(app))
	}
}
