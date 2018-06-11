listener "tcp" {
  address = "192.168.7.2:8200"
  tls_cert_file = "/etc/pki/tls/certs/vault/app.crt"
  tls_key_file = "/etc/pki/tls/private/vault/appcert.key"
}

listener "tcp" {
  address = "127.0.0.1:8200"
  tls_cert_file = "/etc/pki/tls/certs/vault/app.crt"
  tls_key_file = "/etc/pki/tls/private/vault/appcert.key"
}

#storage "inmem" {}
storage "file" {
  path = "/home/vagrant/vaultStorage"
}
