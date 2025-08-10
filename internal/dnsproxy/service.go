package dnsproxy

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// DnsServiceProxy represents a proxy for the DnsService.
type DnsServiceProxy struct {
	baseURL string
}

// NewDnsServiceProxy creates a new instance of DnsServiceProxy.
func NewDnsServiceProxy(baseURL string) *DnsServiceProxy {
	return &DnsServiceProxy{
		baseURL: baseURL,
	}
}

// GetAddresses fetches all addresses.
func (s *DnsServiceProxy) GetAddresses() ([]NodeAddress, error) {
	url := fmt.Sprintf("%s/Address", s.baseURL)
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to make GET request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var addresses []NodeAddress
	if err := json.Unmarshal(body, &addresses); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response body: %w", err)
	}

	return addresses, nil
}

// GetAddressByUrn fetches an address by its URN.
func (s *DnsServiceProxy) GetAddressesByUrn(urn int) ([]NodeAddress, error) {
	url := fmt.Sprintf("%s/Address/urn/%d", s.baseURL, urn)
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to make GET request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var addresses []NodeAddress
	if err := json.Unmarshal(body, &addresses); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response body: %w", err)
	}

	return addresses, nil
}

// GetAddressByIp fetches an address by its IP address.
func (s *DnsServiceProxy) GetAddressByIp(ip string) (*NodeAddress, error) {
	url := fmt.Sprintf("%s/Address/Ip/%s", s.baseURL, ip)
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to make GET request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var address NodeAddress
	if err := json.Unmarshal(body, &address); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response body: %w", err)
	}

	return &address, nil
}

// GetAddressById fetches an address by its ID.
func (s *DnsServiceProxy) GetAddressById(id string) (*NodeAddress, error) {
	url := fmt.Sprintf("%s/Address/id/%s", s.baseURL, id)
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to make GET request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var address NodeAddress
	if err := json.Unmarshal(body, &address); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response body: %w", err)
	}

	return &address, nil
}
