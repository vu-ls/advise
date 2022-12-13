## AdVISE

## Description

AdVISE (the Advanced Vulnerability Information Sharing Environment) is a multi-party vulnerability reporting, coordination, and disclosure platform. AdVISE allows PSIRTs and other coordinators manage access to information and to track vulnerabilities from initial reporting through public disclosure.

AdVISE is a hybrid React/Django project. Most views are React single-page applications that receive data through the Django REST Framework API. As such, there are a few steps to spin up a development environment. The included docker-based dev/test environment is the preferred method for quick installation. See [docs/README-quickstart](docs/README-quickstart.md) for instructions.

AdVISE supports OAuth2 and local authentication through the [django-allauth](https://django-allauth.readthedocs.io/en/latest/index.html) library.
An OAuth2 provider is included with AdVISE or you can configure an OAuth2 provider of your choosing. Supported providers and instructions can be found [here](https://django-allauth.readthedocs.io/en/latest/providers.html).

There are multiple configuration options, specifically for authentication and multi-factor authentication. See [docs](docs).

Swagger API documentation is provided through [drf-yasg](https://github.com/axnsan12/drf-yasg/) and can be accessed through your [local installation](http://localhost:8000/swagger).

## Installation

* [Quickstart](docs/README-quickstart.md)
* [Local install](docs/dev-install.md)
* Examples of more complex installations can be found in [deploy/examples](deploy/examples)

## Documentation

* [Documentation](docs)

## Tests

AdVISE Tests can be found in [cvdp/tests](cvdp/tests). The tests cover most user roles access to most API endpoints. There are two options to run application tests. If the application is running locally, use `manage.py` to run tests:

``` {.sh}
python manage.py test
```

If a local environment is not set up (for instance, in CI/CD pipelines, or when deploying to cloud providers), the tests can also be run in the containerized test environment using `docker-compose`:

1. Copy the `deploy/docker/example.env.test.local` into the top-level directory (where you are reading this) as `.env.test.local`.

2. Edit `.env.test.local` and change the `POSTGRES_PASSWORD`, `DB_PASS`, and the three `DJANGO_SUPERUSER_*` variables as appropriate.
**NOTE**: The `POSTGRES_PASSWORD` and `DB_PASS` **MUST MATCH**. This file cannot make reference to variables declared inside itself.

3. Uncomment the line to set the `RUN_TESTS_ONLY` variable.

4. Build the containers: `docker compose -f deploy/docker/docker-compose-test.yml build`

5. Run the tests: `docker compose -f deploy/docker/docker-compose-test.yml up --exit-code-from advise`

The process will exit with the exit code of the advise container after running the tests, or with the exit code from the first container that fails prior to the tests running. Logs will be output to the console. This is useful for CI/CD pipelines and automated testing frameworks.

## Contributing

AdVISE is developed and maintained by Emily Sarneso (@esarneso) and Jonathan Woytek (@woytek) from [vu.ls](https://www.vu.ls). We encourage feature requests, bug reports, and contributions.

1. Have an idea? Check for open issues or create one to start a discussion around a new feature or improvement.

2. Found a bug? Check for open issues, create a new one. PRs are also welcome.

3. Modify the API or create a new view? Make sure to run the tests to ensure no current functionality broke in the process. Then, create a test to show that your feature works as expected.

4. Feeling shy? Send us [mail](mailto:contactus@vu.ls) to discuss an idea or get support.

## License

AdVISE is released under the GNU Affero General Public License (AGPL).

## Roadmap

AdVISE is under active development. In the coming months, we plan to improve upon the existing implementation and add many new features.

## Looking for support?

vu.ls has many years of experience in coordinating vulnerabilities, vulnerability analysis, and PSIRT consultation. We offer varying levels of support in these fields. Visit [vu.ls](https://www.vu.ls) for more information.
