#!/bin/sh
echo " ============================= "
echo "| >>> setup vault (0.9.3) <<< |"
echo " ============================= "
VAULT_INSTALL_DIR=/opt/vault


cp -r /sdata/vault/ $VAULT_INSTALL_DIR/
mv $VAULT_INSTALL_DIR/vault.service /etc/systemd/system/
echo "%%%%%>  downloading vault executable..."
cd $VAULT_INSTALL_DIR
wget -q https://releases.hashicorp.com/vault/0.9.3/vault_0.9.3_linux_amd64.zip
unzip -q /opt/vault/vault_0.9.3_linux_amd64.zip
echo "%%%%%>  setting up directory for filesystem backend"
mkdir /home/vagrant/vaultStorage
$VAULT_INSTALL_DIR/vault -v
systemctl daemon-reload
systemctl enable vault
echo "%%%%%>  vault as a service ready to start"
systemctl start vault
systemctl status vault

# for convenience
echo "%%%%%>  adding vault to the path (vagrant user)"
sed -i '/^PATH=/ s/$/:\/opt\/vault/' /home/vagrant/.bash_profile

# init
# vault operator init -key-shares=3 -key-threshold=2

# project hush - keep it secret, keep it safe
#   establish and protect two assets; application database and general security module
#   general security module (gsm) - thing that provides security; credentials, certificates, etc.
#   need wrappers (host VMs in this case) for our respective assets:
#     root operations (rootops.dv.net)
#     application database (database.dv.net) - using mongo
#
# certificate structure
#   root ca
#     rootops host
#     vault application
#     mongo application (server)
#     mongo cluster auth (client)
#
# vault cert role options
#  Key                        Value
#  ---                        -----
#  allow_any_name             false
#  allow_bare_domains         false
#  allow_glob_domains         false
#  allow_ip_sans              true
#  allow_localhost            true
#  allow_subdomains           true
#  allow_token_displayname    false
#  allowed_domains            [dv.net]
#  client_flag                true
#  code_signing_flag          false
#  email_protection_flag      false
#  enforce_hostnames          true
#  generate_lease             false
#  key_bits                   2048
#  key_type                   rsa
#  key_usage                  [DigitalSignature KeyAgreement KeyEncipherment]
#  max_ttl                    72h0m0s
#  no_store                   false
#  organization               []
#  ou                         []
#  server_flag                true
#  ttl                        0s
#  use_csr_common_name        true
#  use_csr_sans               true


#Unseal Key 1: ZrZ3m4SX7UxdZ6iMlaT0NjFmbtUXNKIMpLtOtTweNE+C
#Unseal Key 2: jCh1YaaLqKvEwCqs1wgwgYq7pxNro4qUvynN/B8Gn3wO
#Unseal Key 3: aJk7w2RyENeAv2Igmj2puAxgpsQdFiX3syei+/pjX9+3
#Initial Root Token: 6f398efa-1ee2-9168-30d4-9297f6ad60fc
