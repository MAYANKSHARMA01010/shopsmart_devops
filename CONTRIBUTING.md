# Contributing to ShopSmart

First off, thank you for considering contributing to ShopSmart. It's people like you that make ShopSmart such a great tool.

## Where do I go from here?

If you've noticed a bug or have a feature request, make one! It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

## Fork & create a branch

If this is something you think you can fix, then fork ShopSmart and create a branch with a descriptive name.

## Get the test suite running

Make sure your changes pass the automated test suite. 

```bash
pnpm install
pnpm run test
```

## Implement your fix or feature

At this point, you're ready to make your changes. Feel free to ask for help; everyone is a beginner at first.

## Make a Pull Request

At this point, you should switch back to your master branch and make sure it's up to date with ShopSmart's master branch:

```bash
git remote add upstream git@github.com:mayank/shopsmart.git
git fetch upstream
git merge upstream/master
```

Then update your feature branch from your local copy of master, and push it!

```bash
git checkout feature-branch
git rebase master
git push --set-upstream origin feature-branch
```

Finally, go to GitHub and make a Pull Request.
