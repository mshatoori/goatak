package sensors

import "context"

type BaseSensor interface {
	Initialize(ctx context.Context) bool
	Start(ctx context.Context, cb func(data any))
}
