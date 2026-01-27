package resend

import (
	"fmt"
	"log/slog"

	"github.com/kdudkov/goatak/pkg/cot"
	"github.com/kdudkov/goatak/pkg/cotproto"
	"github.com/kdudkov/goatak/pkg/model"
)

// MessageRouter routes messages to configured destinations
type MessageRouter struct {
	sendToDestination func(msg *cotproto.TakMessage, dest model.SendItemDest, src *model.SendItemDest) error
	logger            *slog.Logger
	srcUrn            int
}

// NewMessageRouter creates a new MessageRouter
func NewMessageRouter(sendToDestination func(msg *cotproto.TakMessage, dest model.SendItemDest, src *model.SendItemDest) error, logger *slog.Logger, srcUrn int) *MessageRouter {
	return &MessageRouter{
		sendToDestination: sendToDestination,
		logger:            logger,
		srcUrn:            srcUrn,
	}
}

// RouteMessage routes a message to the destination specified in the configuration
func (r *MessageRouter) RouteMessage(msg *cot.CotMessage, config *ResendConfig) error {
	if msg == nil {
		return fmt.Errorf("message is nil")
	}

	if config == nil {
		return fmt.Errorf("config is nil")
	}

	if config.Destination == nil {
		return fmt.Errorf("destination is nil in config %s", config.UID)
	}

	// Convert destination to SendItemDest
	src, dest := config.Destination.GetSrcAndDest(r.srcUrn)

	// Get the TakMessage from the CotMessage
	takMsg := msg.GetTakMessage()
	if takMsg == nil {
		return fmt.Errorf("failed to get TakMessage from CotMessage")
	}

	// Send the message to the destination
	err := r.sendToDestination(takMsg, dest, src)
	if err != nil {
		r.logger.Error("Failed to send message to destination",
			"error", err,
			"config", config.UID,
			"dest_ip", dest.Addr,
			"dest_urn", dest.URN,
			"message_type", msg.GetType(),
			"message_uid", msg.GetUID())
		return fmt.Errorf("failed to send message to destination: %w", err)
	}

	r.logger.Debug("Successfully routed message",
		"config", config.UID,
		"dest_ip", dest.Addr,
		"dest_urn", dest.URN,
		"message_type", msg.GetType(),
		"message_uid", msg.GetUID())

	return nil
}

// CreateDestination converts a NetworkAddressDTO to model.SendItemDest
// func (r *MessageRouter) CreateDestination(addr *NetworkAddress) model.SendItemDest {
// 	if addr == nil {
// 		r.logger.Warn("NetworkAddressDTO is nil, using default destination")
// 		return model.SendItemDest{
// 			Addr: "255.255.255.255",
// 			URN:  16777215, // Broadcast URN
// 		}
// 	}

// 	switch addr.Type {
// 	case "node":
// 		return model.SendItemDest{
// 			Addr: addr.IP,
// 			URN:  int(addr.URN),
// 		}
// 	case "subnet":
// 		// For subnet, we use the subnet IP as broadcast address
// 		// and the broadcast URN
// 		return model.SendItemDest{
// 			Addr: addr.IP,  // This should be the broadcast address for the subnet
// 			URN:  16777215, // Broadcast URN
// 		}
// 	default:
// 		r.logger.Warn("Unknown network address type, using node destination",
// 			"type", addr.Type,
// 			"ip", addr.IP,
// 			"urn", addr.URN)
// 		return model.SendItemDest{
// 			Addr: addr.IP,
// 			URN:  int(addr.URN),
// 		}
// 	}
// }

// // RouteMessageToMultipleDestinations routes a message to multiple destinations
// // This could be useful for future enhancements where a single config might have multiple destinations
// func (r *MessageRouter) RouteMessageToMultipleDestinations(msg *cot.CotMessage, destinations []*NetworkAddressDTO) []error {
// 	var errors []error

// 	for _, dest := range destinations {
// 		if dest == nil {
// 			continue
// 		}

// 		sendDest := r.CreateDestination(dest)
// 		takMsg := msg.GetTakMessage()
// 		if takMsg == nil {
// 			errors = append(errors, fmt.Errorf("failed to get TakMessage from CotMessage"))
// 			continue
// 		}

// 		err := r.sendToDestination(takMsg, sendDest)
// 		if err != nil {
// 			r.logger.Error("Failed to send message to destination",
// 				"error", err,
// 				"dest_ip", sendDest.Addr,
// 				"dest_urn", sendDest.URN)
// 			errors = append(errors, err)
// 		} else {
// 			r.logger.Debug("Successfully routed message to destination",
// 				"dest_ip", sendDest.Addr,
// 				"dest_urn", sendDest.URN)
// 		}
// 	}

// 	return errors
// }

// ValidateDestination validates that a destination is properly configured
// func (r *MessageRouter) ValidateDestination(dest *NetworkAddressDTO) error {
// 	if dest == nil {
// 		return fmt.Errorf("destination is nil")
// 	}

// 	if dest.IP == "" {
// 		return fmt.Errorf("destination IP is empty")
// 	}

// 	switch dest.Type {
// 	case "node":
// 		if dest.URN == 0 {
// 			return fmt.Errorf("node destination requires a valid URN")
// 		}
// 	case "subnet":
// 		// For subnet, URN is optional as it defaults to broadcast
// 	default:
// 		return fmt.Errorf("unknown destination type: %s", dest.Type)
// 	}

// 	return nil
// }

// ResolveDestination resolves a NetworkAddress interface to model.SendItemDest
// This method is provided for compatibility with the existing NetworkAddress interface
// func (r *MessageRouter) ResolveDestination(addr NetworkAddress) model.SendItemDest {
// 	if addr == nil {
// 		r.logger.Warn("NetworkAddress is nil, using default destination")
// 		return model.SendItemDest{
// 			Addr: "255.255.255.255",
// 			URN:  16777215,
// 		}
// 	}

// 	switch addr := addr.(type) {
// 	case *NodeNetworkAddress:
// 		return model.SendItemDest{
// 			Addr: addr.GetIP(),
// 			URN:  int(addr.GetURN()),
// 		}
// 	case *SubnetNetworkAddress:
// 		return model.SendItemDest{
// 			Addr: addr.GetIP(), // Broadcast address
// 			URN:  16777215,     // Broadcast URN
// 		}
// 	default:
// 		r.logger.Warn("Unknown NetworkAddress type, using default destination",
// 			"type", fmt.Sprintf("%T", addr))
// 		return model.SendItemDest{
// 			Addr: addr.GetIP(),
// 			URN:  int(addr.GetURN()),
// 		}
// 	}
// }
