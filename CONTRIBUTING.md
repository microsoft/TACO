TACO welcomes and encourages community contributions. We want to invite you all to join in our journey to grow an active community of Cordova developers to build amazing apps using TACO!

Visit [README.md](https://github.com/Microsoft/TACO/blob/master/README.md#Development) to learn how to build and run TACO


## Issues Contribution 

* Issues contribution must have a tracking approved issue (Milestone = Community) by TACO team in [Issues](https://github.com/Microsoft/TACO/issues). 
* Your PR should have a link to the Issue that you are fixing. 

## Features Contribution

Features are new or improved functionality to TACO. For example, 
* Adding a new command to TACO CLI say "taco info" is a feature. 
* Improving DependencyInstaller to support more packages is a feature.

Features contributions are acceptable but need to be approved (Milestone = Community) by TACO Collaborators.

## Legal

You will need to complete a Contributor License Agreement (CLA). Briefly, this agreement testifies that you are granting us permission to use the submitted change according to the terms of the project's license, and that the work being submitted is under appropriate copyright.

Please submit a Contributor License Agreement (CLA) before submitting a pull request. You may visit https://cla.microsoft.com to sign digitally. Alternatively, download the agreement ([Microsoft Contribution License Agreement.docx](https://www.codeplex.com/Download?ProjectName=typescript&DownloadId=822190) or [Microsoft Contribution License Agreement.pdf](https://www.codeplex.com/Download?ProjectName=typescript&DownloadId=921298)), sign, scan, and email it back to <cla@microsoft.com>. Be sure to include your github user name along with the agreement. Once we have received the signed CLA, we'll review the request. 

## Sending PR

Your pull request should: 

* Include a clear description of the change
* Be a child commit of a reasonably recent commit in the **master** branch 
    * Requests need not be a single commit, but should be a linear sequence of commits (i.e. no merge commits in your PR)
* It is desirable, but not necessary, for the tests to pass at each commit
* Have clear commit messages 
    * e.g. "Refactor feature", "Fix issue", "Add tests for issue"
* Include adequate tests 
    * At least one test should fail in the absence of your non-test code changes. If your PR does not match this criteria, please specify why
    * Tests should include reasonable permutations of the target fix/change
    * Include baseline changes with your change
    * All changed code must have 100% code coverage
* Ensure there are no linting issues ("gulp tslint")
* To avoid line ending issues, set `autocrlf = input` and `whitespace = cr-at-eol` in your git configuration

