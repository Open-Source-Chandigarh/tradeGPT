\# Transfer Learning Base Weights



\## Quick Start



\### One-time Setup (Maintainers)



Train the base model (takes ~15 minutes):



This creates `base\_stock\_weights.weights.h5` in this directory.



\## What It Does



The base model learns general stock market patterns from 9 diverse stocks:

\- TCS, Infosys, Wipro (IT sector)

\- HDFC, ICICI, SBI (Banking sector)  

\- Reliance, ITC, HUL (FMCG/Energy sector)



This allows new stock predictions to:

\- Train in 5 epochs instead of 30

\- Complete in ~4 seconds instead of 2-5 minutes

\- Maintain same accuracy









