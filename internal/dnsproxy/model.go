package dnsproxy

type NodeAddress struct {
	ID          *string `json:"id"`
	Urn         *int32  `json:"urn"`
	UnitName    *string `json:"unitName"`
	IPAddress   *string `json:"ipAddress"`
	Description *string `json:"description"`
}
