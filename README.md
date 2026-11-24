# Open Simulation & Optimization

A practical guide to open-source engineering simulation, electrical tools, numerical optimization and high-performance computing.

- [Read the GitHub Pages guide](https://zmath01.github.io/optimization-simulation/)
- [Browse the site and runnable examples](docs/)
- [Play the Optimization Algorithm Lab](https://zmath01.github.io/optimization-simulation/algorithms.html)
- [PLC 与嵌入式：MIT OCW、仿真与实测](https://zmath01.github.io/optimization-simulation/plc-embedded.html)

To preview locally, run `python -m http.server 8000 --directory docs` from the repository root and open `http://localhost:8000/`. Example commands, dependencies, assumptions and validation notes are in the guide.

The [Deploy GitHub Pages workflow](.github/workflows/pages.yml) publishes the static `docs/` directory on changes to the site or workflow on `main`. For initial setup, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. Then open **Actions → Deploy GitHub Pages → Run workflow** and select `main`. The site requires no build command.

The lab compares gradient descent, damped Newton and BFGS with Armijo backtracking, then compares clipping, projected gradient and an exact box-constrained reference. Run the numerical regression checks with `node --test tests/solver-core.test.mjs`.
