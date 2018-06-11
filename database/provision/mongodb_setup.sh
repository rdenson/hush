#!/bin/sh
echo " ===================== "
echo "| >>> setup mongo <<< |"
echo " ===================== "
THIS_HOST=mongo.dv.net
TLS_BASE_DIR=/etc/pki/tls


echo "%%%%%>  installing mongodb community edition locally"
cp /sdata/mongodb-org-3.6.repo /etc/yum.repos.d/
yum install -y mongodb-org
cp /sdata/mongod.conf /etc/mongod.conf
chmod 644 /etc/mongod.conf
echo "%%%%%>  generate host csr"
mkdir $TLS_BASE_DIR/certs/$THIS_HOST
mkdir $TLS_BASE_DIR/private/$THIS_HOST
openssl genrsa -out $TLS_BASE_DIR/private/$THIS_HOST/host.key 2048
echo "%%%%%>  but we need to include a SAN..."
echo "[SAN]" | sudo tee -a /etc/pki/tls/openssl.cnf >/dev/null
echo "subjectAltName=DNS:127.0.0.1,DNS:192.168.7.3" | sudo tee -a /etc/pki/tls/openssl.cnf >/dev/null
#echo "DNS.1        = 127.0.0.1" | sudo tee -a /etc/pki/tls/openssl.cnf >/dev/null
#echo "DNS.2        = 192.168.7.3" | sudo tee -a /etc/pki/tls/openssl.cnf >/dev/null
#echo "DNS.2        = mongo.dv.net" | sudo tee -a /etc/pki/tls/openssl.cnf >/dev/null

# a word about mongodb TLS connections...
#   In order to provide encryption in transit, we need mongo to maintain a
#   server certificate and given other nodes, a cluster certificate. When
#   creating the server certificate, create with the SERVER purpose. For each
#   node in the cluser, create with the CLIENT purpose. Similarly, connect to
#   mongo with a cert built for a CLIENT purpose.
#
#   *** SERVER PURPOSE ***
#     in the CA conf file you may have: extendedKeyUsage = serverAuth, which
#     will generate the following in the cert:
#       X509v3 Extended Key Usage:
#         TLS Web Server Authentication
openssl req -new -subj '/C=US/ST=Texas/O=DensonVentures/CN=mongo.dv.net' -reqexts SAN -key $TLS_BASE_DIR/private/$THIS_HOST/host.key -out $TLS_BASE_DIR/private/$THIS_HOST/host.csr
# move csr to data folder so we can sign it
cp $TLS_BASE_DIR/private/$THIS_HOST/host.csr /sdata/
# after signing...
# concatenate the cert and key to form the pem file
# set owner of cert/key pem file to mongod (systemd executor); set file permissions to 600
# fix for selinux chcon system_u:object_r:mongod_var_lib_t:s0
echo "%%%%%>  installing selinux managment dependency"
yum install -y policycoreutils-python
semanage port -a -t mongod_port_t -p tcp 27017
echo "%%%%%>  starting mongod service"
systemctl enable mongod
# assumes that the CA and certificate-key pair pem file exists as specified by the mongo config
systemctl start mongod
