### *************************************************************************###
### ************************* REMOTE ROUTINES *******************************###
### *************************************************************************###
from __future__ import with_statement
from fabric.contrib.files import exists, sed
from fabric.api import env, local, run, settings, abort
from fabric.contrib.console import confirm

import os

APP_NAME = "guide"
BASE_DIR = os.path.dirname(os.path.realpath(__file__))

### *************************************************************************###
### ******************** BEGIN DEPLOYMENT ***********************************###
### *************************************************************************###


def build_rmarkdown():
    """
        Go into src/Rmd and process the files
         - convert .Rmd to .md (knitr)
         - copy over figure files (knitr)
         - copy over .md files (bash)
    """
    GUIDE_DIR = os.path.join(BASE_DIR, 'guide')
    RMD_DIR = os.path.join(BASE_DIR, 'guide/src/Rmd')

    # Recurse down the RMD_DIR for each .Rmd file
    for root, dirs, filenames in os.walk(RMD_DIR):
        for filename in filenames:
            source = os.path.join(root, filename)

            if '.Rmd' in filename:
                relative = os.path.split(os.path.relpath(os.path.join(root, filename), RMD_DIR))[0]
                filename_root = os.path.splitext(filename)[0]
                media_path = os.path.join(relative, filename_root)

                destination = os.path.splitext(source)[0] + '.md'
                final = os.path.join(relative, os.path.split(destination)[1])

                # print('root: %s' % (root,))
                # print('filename: %s' % (filename,))
                # print('filename_root: %s' % (filename_root,))
                # print('media_path: %s' % (media_path,))
                # print('relative: %s' % (relative,))
                # print('destination: %s' % (destination,))
                # print('final: %s' % (final,))

                local('cd guide && Rscript build.R %s %s %s' % (source, destination, media_path))
                local('cd guide && mv %s %s' % (destination, final))

            elif '.html' in filename:
                # Remove any other files
                local('rm %s' % (source,))


### Run with `$ fab deploy:message="This is a commit"`
def deploy(*args, **kwargs):
    print("Commiting to git with message '%s'" % kwargs['message'])
    _lgitcommit(kwargs['message'])

    print("Pushing to gh-pages...")
    _lgitpush()

    print("Tagging this as LIVE...")
    _lgittag()

    print("Done")

def _lgitcommit(message='update `date +COMMIT-%F/%H%M`'):
    local('cd guide && git add .')
    with settings(warn_only=True):
        result = local('cd guide && git commit -am "%s"' % (message,))
    if result.failed and not confirm("No commits to make. Continue anyway?"):
        abort("Aborting at user request.")

def _lgitpush():
    local('cd guide && git push origin gh-pages')

def _lgittag():
    local('cd guide && git tag -f LIVE')
    local('cd guide && export TAG=`date +DEPLOYED-%F/%H%M` && git tag $TAG && git push -f origin $TAG')
### *************************************************************************###
### ************************* END DEPLOYMENT ********************************###
### *************************************************************************###
