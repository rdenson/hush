#!/bin/sh
echo " ===================== "
echo "| >>> base config <<< |"
echo " ===================== "
yum -y update
yum -y install wget ntp git unzip net-tools ansible
echo "%%%%%>  cleaning up after yum"
yum -y clean all

# add ansible user
ANI_SSH=/home/ani/.ssh
useradd -m -U ani
echo "%ani ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers.d/ani
mkdir $ANI_SSH
chmod 700 $ANI_SSH
ssh-keygen -q -f id_rsa -N ''
mv id_rsa* $ANI_SSH/
chown -R ani:ani $ANI_SSH
cat $ANI_SSH/id_rsa.pub >> $ANI_SSH/authorized_keys
chown ani:ani $ANI_SSH/authorized_keys
chmod 600 $ANI_SSH/id_rsa $ANI_SSH/authorized_keys
