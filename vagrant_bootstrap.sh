#!/usr/bin/env bash

apt-get update
apt-get install -y python-software-properties python g++ make
add-apt-repository ppa:chris-lea/node.js
apt-get update
apt-get install -y nodejs
apt-get install -y git-core
apt-get install -y tmux
apt-get install -y vim
apt-get install -y redis-server
cd /vagrant
npm install -g express
npm install -g socket.io
npm install
node parser