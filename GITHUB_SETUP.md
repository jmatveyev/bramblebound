# GitHub repository setup

This package contains BRAMBLEBOUND 1.1 Touch Edition. Preparing this package
has not created a GitHub repository, uploaded any files, or enabled a public site.
The game code is unchanged from the supplied Touch Edition.

## Create the repository

Suggested owner: `jmatveyev`. Suggested name: `bramblebound`.

Create form:
https://github.com/new?owner=jmatveyev&name=bramblebound&visibility=private&description=BRAMBLEBOUND%201.1%20Touch%20Edition

Private is the suggested starting visibility. Change it only deliberately.
No open-source license has been added on your behalf.

For a connector-based upload, enable Add a README when creating the repository.
This creates an initial branch and commit. Grant the connected GitHub app access
to the new repository if its installation is limited to selected repositories.
Then supply the repository URL in the chat. Repository creation and repository
file editing are separate capabilities; the currently available connector
exposes file editing but not repository creation.

## Files to upload

Unzip the package and place the CONTENTS of the bramblebound folder at the
repository root, not the ZIP itself and not an extra enclosing folder.
Preserve source/, tests/, screenshots/, and docs/.
The prepared README.md should replace the initial GitHub-generated README.

- index.html: complete playable game at the repository root.
- bramblebound.html: identical standalone entry used by existing test launchers.
- docs/index.html: identical game-only GitHub Pages publishing entry.
- docs/.nojekyll: static publishing marker.
- source/: editable game source.
- tests/: existing diagnostic suites, fixtures, and recorded results.
- TESTING.md and verification.json: prior test results and limitations.
- WALKTHROUGH.md: full story spoilers.
- serve.py: optional trusted-LAN development server.
- build_site.py: rebuilds all three entry points.

## Optional: enable a phone-accessible play URL

Creating a repository alone does NOT host the game as a playable website.
After the files have been uploaded, use the repository's Settings > Pages:

1. Choose Deploy from a branch as the publishing source.
2. Choose main (or the actual default branch) and the /docs folder.
3. Save, then use the live website URL shown by GitHub after deployment succeeds.

Only docs/ is the intended website payload. Do not select the repository root
unless you also intend to publish its source, test files, and documentation.
The delivered browser game itself includes its JavaScript and is downloadable
by visitors. A private repository does not make a published game secret.

GitHub Pages for a private repository requires an eligible paid plan. GitHub Free
supports Pages for public repositories. Do not change repository visibility just
to enable Pages without considering whether the source should be public.
Pages sites are generally public even when the backing repository is private.
No Pages deployment has been performed or verified for this package.

## Rebuild after editing

From the repository root, run:

    python3 build_site.py

Commit all three updated HTML entry points. The build uses only Python's
standard library. Existing browser tests have additional requirements described
in TESTING.md. Their recorded results were not rerun for this packaging task.
The packaging task verifies byte-identical rebuilds, not phone compatibility.

## References

GitHub documentation checked September 7, 2026:
- https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
