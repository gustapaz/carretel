# Carretel

**Não deixe o fio virar nó.** Um arcade circular original de três pistas e doze setores. Recolha oito carretéis, desvie dos nós e encontre um caminho sem ocupar as casas do próprio corpo.

[Jogar gratuitamente](https://gustapaz.github.io/carretel/)

## Como jogar

A fita avança sempre um setor no sentido horário. Cada pulso permite manter a pista ou passar para uma pista vizinha. Coletar um carretel alonga a fita; oito coletas vencem. Entrar num nó ou numa casa ocupada pelo corpo encerra a rodada. A ponta da cauda pode sair no mesmo pulso, exceto ao crescer. Há 180 pulsos de fio.

- Esquerda/cima/A: para dentro; direita/baixo/D: para fora.
- Espaço/Enter: manter pista. Teclas somente com a arena focada.
- Botões equivalentes por clique/toque, sem arraste ou precisão no Canvas.
- Escape/P pausa. Pelo modal é possível voltar aos seletores sem registrar a rodada abandonada.
- Treino avança por ação. Cadência avança a cada 650 ms; Giro a cada 400 ms. Nos ritmos contínuos, o comando prepara apenas o próximo pulso e depois volta a manter.

Três tramas autorais, com nós e sementes fixos. A próxima coleta nasce numa casa livre. O mapa em texto informa cabeça, nós, corpo e coleta. O círculo tracejado mostra a próxima casa. Desenhos entre casas são ilustrativos; colisões são decididas nas casas, não por interseção contínua dos traços.

Pontos: 100 por coleta; ao vencer, bônus de `2 × (200 − pulsos gastos)`. Histórico local separado em três tramas × três ritmos, sem ranking online confiável. Som opcional e movimento reduzido; os pulsos e as regras continuam iguais.

## Tecnologia e execução

p5.js 2.3.4 modular (core + accessibility), TypeScript 7.0.2 e esbuild 0.28.2. Modelo puro separado do desenho Canvas 2D e da interface DOM. Canvas lógico 640 × 640, DPR limitado a 2. Passo fixo com atraso limitado; primeiro frame de início/retomada descartado. `noLoop` no treino, menus, pausa e resultados; `redraw` por evento. Desenho a 30 Hz nos ritmos contínuos, sem promessa de FPS universal.

Node 24 e npm:

```sh
npm ci
npm test
npm run build
npm run dev
```

Servidor local http://127.0.0.1:4257 serve o export e observa JS/TS/CSS. Alterações em public ou scripts pedem reiniciar o servidor. CI testa, audita, faz build e publica somente dist no GitHub Pages com caminhos relativos.

## Licenças, dados e limites

Código do jogo MIT. **p5.js é LGPL-2.1**, preservado num arquivo ESM separado e substituível `p5.js`; não se torna MIT. Versão exata e receita modular no lockfile/script de build; fonte em https://github.com/processing/p5.js/tree/v2.3.4 . Licenças das dependências efetivamente incluídas acompanham `third-party.txt` e comentários legais do bundle. [Assets](docs/assets.md).

Sem backend, conta, chaves, API remota, compras, cartão, faturamento ou trial. Preferências e recordes ficam no localStorage deste navegador. Rodada em andamento não é salva. Sem sincronização, garantia offline ou gamepad. Dados locais são modificáveis pelo próprio usuário. As tramas e o visual são próprios, sem importar jogos, níveis ou assets comerciais.

[Design](docs/game-design.md) · [Validação e limites](docs/validation.md)
