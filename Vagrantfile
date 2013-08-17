Vagrant::Config.run do |config|
    config.vm.box = "precise64"
    config.vm.box_url = "http://files.vagrantup.com/precise64.box"
    config.vm.provision :shell, :path => "vagrant_bootstrap.sh"
    config.vm.forward_port 3000, 3000
end

