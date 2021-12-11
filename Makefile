# Retrieve the UUID from ``metadata.json``
UUID = $(shell grep -E '^[ ]*"uuid":' src/metadata.json | sed 's@^[ ]*"uuid":[ ]*"\(.\+\)",[ ]*@\1@')

ifeq ($(strip $(DESTDIR)),)
INSTALLBASE = $(HOME)/.local/share/gnome-shell/extensions
else
INSTALLBASE = $(DESTDIR)/usr/share/gnome-shell/extensions
endif
INSTALLNAME = $(UUID)

$(info UUID is "$(UUID)")

clean:
	rm -rf _build

package:
	mkdir -p _build
	cd src && zip -qr "../_build/$(UUID)$(VSTRING).zip" .

enable:
	gnome-extensions enable ${UUID}

disable:
	gnome-extensions disable ${UUID}

listen:
	journalctl -o cat -n 0 -f "$$(which gnome-shell)"

install:
	rm -rf $(INSTALLBASE)/$(INSTALLNAME)
	mkdir -p $(INSTALLBASE)/$(INSTALLNAME)
	cp -r src/* $(INSTALLBASE)/$(INSTALLNAME)/

uninstall:
	rm -rf $(INSTALLBASE)/$(INSTALLNAME)

nested-session:
	dbus-run-session -- env  MUTTER_DEBUG_DUMMY_MONITOR_SCALES=2 gnome-shell --nested --wayland

