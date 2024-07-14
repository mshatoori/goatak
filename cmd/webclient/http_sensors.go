package main

import (
	"encoding/json"
	"sync"

	"github.com/aofei/air"
	"github.com/kdudkov/goatak/pkg/model"
)

func getSensorsHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		return res.WriteJSON(getSensors(app))
	}
}

func addSensorHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		f := new(model.Sensor)

		// TODO: Validation!

		if req.Body == nil {
			return nil
		}

		if err := json.NewDecoder(req.Body).Decode(f); err != nil {
			return err
		}

		m := sync.Map{}
		m.Store("addr", f.Addr)
		m.Store("port", f.Port)

		newSensor := &Sensor{
			Type:   f.Type,
			UID:    f.UID,
			Config: m,
		}

		app.sensors = append(app.sensors, newSensor)
		// TODO: actually start new sensor :/
		return res.WriteJSON(getSensors(app))
	}
}

type Sensor struct {
	UID    string
	Type   string
	Config sync.Map
}

func getSensors(app *App) []*model.Sensor {
	sensors := make([]*model.Sensor, 0)

	for _, s := range app.sensors {
		sensorModel := model.Sensor{
			UID:  s.UID,
			Type: s.Type,
		}

		if v, ok := s.Config.Load("addr"); ok {
			sensorModel.Addr = v.(string)
		}

		if v, ok := s.Config.Load("port"); ok {
			sensorModel.Port = v.(int)
		}

		sensors = append(sensors, &sensorModel)
	}

	return sensors
}
