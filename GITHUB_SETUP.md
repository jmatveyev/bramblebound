# GitHub hosting setup

## Repository

BRAMBLEBOUND 1.1 Touch Edition is published at:
https://github.com/jmatveyev/bramblebound

The repository is public at the owner's request. No open-source license has been
selected. Game code is unchanged from the delivered Touch Edition.

## Enable the playable website

Repository publication and website hosting are separate. Open:
https://github.com/jmatveyev/bramblebound/settings/pages

Under Build and deployment:

1. Set Source to **Deploy from a branch**.
2. Set Branch to **main** and Folder to **/docs**.
3. Save. Use the website address shown by GitHub after deployment succeeds.

The intended address is https://jmatveyev.github.io/bramblebound/.
It is not confirmed live merely because these instructions exist.

Only docs/ is the intended website payload. It contains the self-contained game
and .nojekyll. The source and testing materials remain in the public repository,
but are not separately served as website pages by this configuration.

Open the live website in a normal phone browser tab, not an attachment preview.
There is no backend, game account, or external asset dependency. Browser saves
are local to their origin; export saves before changing browser or website.

## Future updates

After editing source, run:

    python3 build_site.py

Commit the updated source and all three HTML outputs. Refresh SHA256SUMS for
changed files, then commit the refreshed manifest. The Build integrity workflow
checks byte-identical rebuilding and file integrity, not gameplay or device
compatibility. Historical gameplay checks and limitations are in TESTING.md.

Once main /docs publishing is enabled, later commits to that publishing source
are eligible for Pages deployment. Check the repository Actions tab for failures.

## Official reference

GitHub Pages publishing-source instructions, checked September 7, 2026:
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
