package sensors

import (
	"github.com/kdudkov/goatak/pkg/model"
)

type BaseSensor interface {
	Initialize() bool
	Start(cb func(data any))
	GetType() string
	ToSensorModel() *model.SensorModel
	GetUID() string
	Stop()
}
