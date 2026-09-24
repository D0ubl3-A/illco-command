# Evidence Root

Store run-scoped immutable evidence beneath this directory. Every evidence file must be hashed, referenced from transactional state, and never overwritten after validation.

Recommended layout: `runs/<run-id>/`, `archives/<archive-id>/`, `tests/<run-id>/`, `validation/<asset-id>/`.
