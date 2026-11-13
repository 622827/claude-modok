# claude-modok

Saját Claude Code modok gyűjteménye.

## task-progress

Minden feladathoz állapotsávot mutat a beviteli mező fölött és az állapotsorban:

```
████████░░░░░░░░░░░░ 40% · eltelt 0:24 · hátra ~0:36
```

- A hátralévő idő becslése az utolsó 30 feladat időtartamának mediánja (kezdetben 60 mp), sessionök között is megmarad.
- Ha a feladat túlfut a becslésen, a becslés menet közben nő; a sáv legfeljebb 95%-ig megy.
- A sáv mellett a lépések (eszközhívások) száma is látszik.

### Telepítés

Claude Code-ban:

```
/plugin marketplace add 622827/claude-modok
/plugin install task-progress@claude-modok
```

A repó privát, ezért a gépeden be kell lenni jelentkezve GitHubra (pl. `gh auth login`).
