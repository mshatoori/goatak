package main

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/aofei/air"
	"github.com/google/uuid"
	"github.com/kdudkov/goatak/pkg/model"
	"github.com/kdudkov/goatak/pkg/sensors"
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

		if f.Type == "GPS" || f.Type == "AIS" {
			//gpsAddr := fmt.Sprintf("%s:%d", f.Addr, f.Port)
			var gpsdSensor = &sensors.GpsdSensor{
				Addr:   fmt.Sprintf("%s:%d", f.Addr, f.Port),
				Conn:   nil,
				Logger: app.logger.With("logger", "gpsd"),
				Reader: nil,
				Type:   f.Type,
				UID:    uuid.New().String(),
			}

			app.sensors = append(app.sensors, gpsdSensor)
			gpsdSensor.Initialize(context.TODO())
			gpsdSensor.Start(context.TODO(), app.sensorCallback)

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
