# Pass Search Provider for GNOME Shell

Find and copy passwords stored in [pass](https://www.passwordstore.org/) in GNOME Shell.

## Installation

### a) Installing from extensions.gnome.org

This is the easiest way to install the extension. Just head over to [extensions.gnome.org](https://extensions.gnome.org/extension/4645/pass-search-provider/)
and flip the switch!

### b) Cloning the Latest Version with git

Execute the clone command below where you want to have the source code of the extension.
```
git clone https://github.com/lavrov/gnome-extension-pass-search-provider.git
cd gnome-extension-pass-search-provider
make install
```

Then logout and login again. Then you can enable the extension with the Gnome Tweak Tool, the Extensions application or with this command:
```
make enable
```
