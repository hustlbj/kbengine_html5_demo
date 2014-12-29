KBEngine_html5_demo
=============

##This client-project is written for kbengine(a MMOG engine of server)
http://www.kbengine.org


##Releases

	binarys		: https://sourceforge.net/projects/kbengine/files/

##Start:
		1: Use git to get the demo-assets(server):

			In the kbengine_html5_demo directory:

			* Git command: git submodule update --init --remote
![submodule_update1](http://www.kbengine.org/assets/img/screenshots/gitbash_submodule.png)

			* Or use TortoiseGit(menu): TortoiseGit -> Submodule Update:
![submodule_update2](http://www.kbengine.org/assets/img/screenshots/unity3d_plugins_submodule_update.jpg)

			*Or manually get the demo-assets(server)
				https://github.com/kbengine/kbengine_demos_assets/releases/latest
				unzip and copy to kbengine/




##Configure demo:

	Change the login address:
		kbengine_html5_demo\kbengine.js -> ip
		kbengine_html5_demo\kbengine.js -> port
		kbengine_html5_demo\kbengine.js ->username
		kbengine_html5_demo\kbengine.js ->password

##Start the servers:

	Build(KBEngine):
		http://www.kbengine.org/docs/build.html

	Installation(KBEngine):
		http://www.kbengine.org/docs/installation.html

	Copy "kbengine_html5_demo\kbengine_demos_assets" to KBEngine root directory:
		"kbengine\" is the engine root.

![demo_configure](http://www.kbengine.org/assets/img/screenshots/demo_copy_kbengine.jpg)


	Start server:
		Windows:
			kbengine\kbengine_demos_assets\start_server_fixed.bat

		Linux:
			kbengine\kbengine_demos_assets\start_server_fixed.sh

		(more: http://www.kbengine.org/docs/startup_shutdown.html)


##Start client

	Local start:
		start index.html

	Or build the Web service:
		http://xxx.xxx.xxx.xxx/index.html
