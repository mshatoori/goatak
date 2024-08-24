package sensors

import (
	"context"
	"github.com/kdudkov/goatak/pkg/model"
)

type BaseSensor interface {
	Initialize(ctx context.Context) bool
	Start(ctx context.Context, cb func(data any))
	GetType() string
	ToSensorModel() *model.SensorModel
}
