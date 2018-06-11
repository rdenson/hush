# hush
I have been experiencing much pain recently surrounding certificates, specifically
infrastructure and processes to maintain such infrastructure. Separation of duties
and process are important but, maybe there's a better way. Enter the code that lives
in this repository.

## Problems
1. Multiple CAs in multiple environments/locales. These where setup by hand.
1. Only one person has had the power bestowed upon them to sign CSRs. Where are
the credentials? What happens when they're unavailable?
1. Maintain "the right amount" of security posture.
1. What happens when we begin to introduce a demand for certificates (*mutual TLS
paradigms*) or we decide to implement certificate standards?

### Notes
There is a lot of things in here. Most of it is my way of attempting to walk the
labyrinth of certificate management. In other words **this is not a solution**,
rather a way to understand what a solution could look like.
