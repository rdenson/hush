#!/bin/sh
echo " ============================== "
echo "| >>> setup self-signed CA <<< |"
echo " ============================== "
TLS_BASE_DIR=/etc/pki/tls
CA_CONF=/etc/pki/tls/instaCA.conf
OPENSSL_CONF=/etc/pki/tls/openssl_alt.cnf


### CA SETUP
cp /sdata/openssl/instaCA.conf $TLS_BASE_DIR/
echo "%%%%%>  setting up certificate authority infrastructure"
mkdir $TLS_BASE_DIR/ca
mkdir $TLS_BASE_DIR/certs/vault
mkdir $TLS_BASE_DIR/private/ca
mkdir $TLS_BASE_DIR/private/vault
# ready ca database and serial files
echo 000a > $TLS_BASE_DIR/ca/serialfile
touch $TLS_BASE_DIR/ca/certindex
# root cert (signing certificate)
echo "%%%%%>  generating root cert"
openssl genrsa -out $TLS_BASE_DIR/private/ca/signing.key 2048
openssl req -x509 -subj '/C=US/ST=Texas/O=DensonVentures/CN=root-ca' -days 365 -key $TLS_BASE_DIR/private/ca/signing.key -out $TLS_BASE_DIR/ca/root-ca.crt

### VAULT APPLICATION CERTIFICATE SETUP
cp /sdata/openssl/openssl_alt.cnf $TLS_BASE_DIR/
# generate host csr
echo "%%%%%>  generating host certificate signing request"
openssl genrsa -out $TLS_BASE_DIR/private/vault/appcert.key 2048
openssl req -new -config $OPENSSL_CONF -subj '/C=US/ST=Texas/O=DensonVentures/CN=vault.dv.net' -key $TLS_BASE_DIR/private/vault/appcert.key -out $TLS_BASE_DIR/private/vault/app.csr
# issue host cert
echo "%%%%%>  issuing host certificate"
openssl ca -batch -config $CA_CONF -notext -in $TLS_BASE_DIR/private/vault/app.csr -out $TLS_BASE_DIR/certs/vault/app.crt

### MAKE OUR CA TRUSTED
update-ca-trust enable
cat $TLS_BASE_DIR/ca/root-ca.crt >> /etc/pki/ca-trust/source/anchors/dvca.crt
update-ca-trust extract
echo "%%%%%>  our CA is now trusted"
