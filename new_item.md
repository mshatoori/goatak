1. Add type to `pkg/model/unit.go` if needed (in constants and `func GetClass(msg *cot.CotMessage)`).
2. Create helper function to make this type of message in the `pkg/cot/utils.go`.
3. Add any new data needed when for serialization and deserialization of web unit data to CotMessage/Item in `func (w *WebUnit) ToMsg() *cot.CotMessage` and `func (i *Item) ToWeb() *WebUnit` (both are in `pkg/model/http.go`).
4. Change `cmd/webclient/http_server.go` if needed to add category in `addItemHandler` function.