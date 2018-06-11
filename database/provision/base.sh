#!/bin/sh
echo " ===================== "
echo "| >>> base config <<< |"
echo " ===================== "
yum -y update
yum -y install wget ntp git unzip net-tools
echo "%%%%%>  cleaning up after yum"
yum -y clean all
