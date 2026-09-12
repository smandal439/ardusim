#ifndef esp_now_h
#define esp_now_h

#include <stdint.h>
#include <stddef.h>

#define ESP_OK          0
#define ESP_FAIL       -1
#define ESP_ERR_ESPNOW_BASE 0x6000
#define ESP_ERR_ESPNOW_NOT_FOUND    (ESP_ERR_ESPNOW_BASE + 1)
#define ESP_ERR_ESPNOW_NOT_INIT     (ESP_ERR_ESPNOW_BASE + 2)
#define ESP_ERR_ESPNOW_NOT_MALLOC   (ESP_ERR_ESPNOW_BASE + 3)
#define ESP_ERR_ESPNOW_NOT_STARTED  (ESP_ERR_ESPNOW_BASE + 4)
#define ESP_ERR_ESPNOW_ARG          (ESP_ERR_ESPNOW_BASE + 5)
#define ESP_ERR_ESPNOW_INTERNAL     (ESP_ERR_ESPNOW_BASE + 6)
#define ESP_ERR_ESPNOW_NO_MEM       (ESP_ERR_ESPNOW_BASE + 7)
#define ESP_ERR_ESPNOW_NOT_FOUND    (ESP_ERR_ESPNOW_BASE + 1)
#define ESP_ERR_ESPNOW_IF           (ESP_ERR_ESPNOW_BASE + 8)

#define ESP_NOW_ETH_ALEN 6
#define ESP_NOW_MAX_DATA_LEN 250

#define ESP_NOW_SEND_SUCCESS 0
#define ESP_NOW_SEND_FAIL    1

#define ESP_WIFI_SECURITY_OPEN       0
#define ESP_WIFI_SECURITY_WEP        1
#define ESP_WIFI_SECURITY_WPA_PSK    2
#define ESP_WIFI_SECURITY_WPA2_PSK   3
#define ESP_WIFI_SECURITY_WPA_WPA2_PSK 4
#define ESP_WIFI_SECURITY_WPA3_PSK   5
#define ESP_WIFI_SECURITY_WPA3_SAE   6
#define ESP_WIFI_SECURITY_MAX        7

#define ESP_CHANNEL_ANY 0
#define ESP_NOW.ImageIcon_MAX_PEERS 20

typedef struct {
    uint8_t peer_addr[ESP_NOW_ETH_ALEN];
    uint8_t channel;
    uint8_t encrypt;
    uint8_t lmk[16];
} esp_now_peer_info_t;

typedef struct {
    int32_t recv_status;
    uint32_t total_bytes;
    int64_t seq_num;
} esp_now_recv_info_t;

typedef void (*esp_now_recv_cb_t)(const uint8_t *mac_addr, const uint8_t *data, int data_len);
typedef void (*esp_now_send_cb_t)(const uint8_t *mac_addr, esp_now_send_status_t status);

int esp_now_init(void);
int esp_now_deinit(void);
int esp_now_register_recv_cb(esp_now_recv_cb_t cb);
int esp_now_register_send_cb(esp_now_send_cb_t cb);
int esp_now_add_peer(const esp_now_peer_info_t *peer);
int esp_now_del_peer(const uint8_t *mac_addr);
int esp_now_mod_peer(const esp_now_peer_info_t *peer);
int esp_now_get_peer(const uint8_t *mac_addr, esp_now_peer_info_t *peer);
int esp_now_fetch_peer(bool begin, esp_now_peer_info_t *peer);
int esp_now_peer_num(int *peer_num);
int esp_now_send(const uint8_t *peer_addr, const uint8_t *data, size_t len);

#endif
