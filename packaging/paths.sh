# Resolve the checkout layout and the /usr layout to the same variables.
# Sourced by bin/shoutr and packaging/doctor.sh. Both pass their own $0,
# because the checkout keeps the binary in build/ and the installed copy
# keeps it next to resources/.

resolve_shoutr_paths() {
	local launcher
	launcher=$(cd "$(dirname "$1")" && pwd)
	SHOUTR_BINARY=""
	SHOUTR_HELPER=""
	SHOUTR_ARCHIVE=""
	SHOUTR_SQLITE=""
	SHOUTR_LAYOUT=""

	# bin/shoutr and packaging/doctor.sh both sit one directory below the
	# checkout root, so ../build is the dev build for either of them.
	# /usr/bin/shoutr and /usr/lib/shoutr/doctor.sh do not have that build.
	if [[ -x $launcher/../build/shoutr && -f $launcher/../build/resources/app.asar ]]; then
		local repo
		repo=$(cd "$launcher/.." && pwd)
		SHOUTR_BINARY=$repo/build/shoutr
		SHOUTR_HELPER=$repo/helper/shoutr_helper_launcher.sh
		SHOUTR_ARCHIVE=$repo/build/resources/app.asar
		SHOUTR_SQLITE=$repo/build/resources/app.asar.unpacked/.webpack/main/native_modules/build/Release/node_sqlite3.node
		SHOUTR_LAYOUT=checkout
		return 0
	fi
	if [[ -x /usr/lib/shoutr/shoutr && -f /usr/lib/shoutr/resources/app.asar ]]; then
		SHOUTR_BINARY=/usr/lib/shoutr/shoutr
		SHOUTR_HELPER=/usr/lib/shoutr/helper/shoutr_helper_launcher.sh
		SHOUTR_ARCHIVE=/usr/lib/shoutr/resources/app.asar
		SHOUTR_SQLITE=/usr/lib/shoutr/resources/app.asar.unpacked/.webpack/main/native_modules/build/Release/node_sqlite3.node
		SHOUTR_LAYOUT=system
		return 0
	fi
	return 1
}
