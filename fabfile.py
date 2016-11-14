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

### Run with `$ fab deploy:message="This is a commit"`
def deploy(*args, **kwargs):

    print("Building...")
    _lbuild()

    print("Commiting to master with message '%s'" % kwargs['message'])
    _lgitcommit(kwargs['message'], branch='master')

    print("Preparing the gh-pages branch...")
    _lprepare()

    # print("Pushing to gh-pages...")
    # _lgitpush()
    #
    # print("Tagging this as LIVE...")
    # _lgittag()

    print("Done")

def _lbuild():
    local('cd guide && jekyll build')

def _lprepare():
    pass
    # local('cd guide && git checkout gh-pages')
    # local('cd guide && ls | grep -v _site| xargs rm -rf')
    # local('cd guide && cp -r _site/* . && rm -rf _site/')
    # local('cd guide && touch .nojekyll')

def _lgitcommit(message='update `date +COMMIT-%F/%H%M`', branch='master'):
    local('cd guide && git checkout %s' %(branch,))
    with settings(warn_only=True):
        result = local('cd guide && git commit -am "%s"' % (message,))
    if result.failed and not confirm("No commits to make. Continue anyway?"):
        abort("Aborting at user request.")

def _lgitpush():
    local('cd guide && git push --all origin')

def _lgittag():
    local('cd guide && git tag -f LIVE')
    local('cd guide && export TAG=`date +DEPLOYED-%F/%H%M` && git tag $TAG && git push -f origin $TAG')
### *************************************************************************###
### ************************* END DEPLOYMENT ********************************###
### *************************************************************************###
