# Installing and updating a local plugin

Official marketplace is builtins-only. New plugins go through a Personal Source.

1. Keep the plugin directory on disk. Do not publish it as `kcode-plugins-official`.
2. Put or update a `marketplace.json` next to the plugin (use `upsert-dev-marketplace.mjs`).
3. In KCode: Plugin Store → Add → file or directory, point at that `marketplace.json` or its folder.
4. Install the plugin from the Personal segment, then enable it.
5. To update: change files and bump `version` in `.kcode-plugin/plugin.json`, then refresh that personal marketplace and update the plugin.

If the source is removed, an already installed plugin stays usable until uninstall, but it cannot update until the same source is added again.
