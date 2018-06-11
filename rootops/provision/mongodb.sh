#!/bin/sh
echo " ============================== "
echo "| >>> mongodb as container <<< |"
echo " ============================== "
echo "%%%%%>  install docker"
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
yum install -y docker-ce
usermod -aG docker vagrant
systemctl enable docker
systemctl start docker
echo "%%%%%>  run a mongo container"
mkdir /home/vagrant/mongodata
docker pull mongo
docker run --name mongoexample -p 27017:27017 -v /home/vagrant/mongodata/:/data/db -d mongo --auth
