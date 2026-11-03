# Validação do Carretel

Executada em 03/11/2026, Node 24, Windows e Chromium do navegador integrado.

## Modelo e build

- Sete testes Node aprovados: vitórias determinísticas nas três tramas; regras comuns aos nove pares trama/ritmo; crescimento, corpo, nós, entrada inválida, cauda vacante, fim aos 180 pulsos, relógio limitado/reset, pontuação e save corrompido. Rotas completas: 64, 54 e 69 pulsos, respectivamente.
- TypeScript estrito e build esbuild concluídos; npm audit sem vulnerabilidades reportadas na árvore instalada.
- p5 modular core + accessibility, em arquivo separado e substituível. Pacote reduzido de aproximadamente 1,5 MB para 413 KB antes de compressão. Bibliotecas/licenças efetivamente incluídas obtidas por metafile. Tag oficial p5 v2.3.4 verificada via git ls-remote: 248584a0c6bc9c7368a00b5d4ad1d17f9d846425.

## Navegador no export local

- Três tramas completas em Treino por teclado: 8/8, 64/54/69 pulsos e 1072/1092/1062 pontos.
- Cadência concluída por teclas e relógio real de 650 ms: 64 pulsos, 1072 pontos. Giro concluído com relógio real de 400 ms: 54 pulsos, 1092 pontos.
- No ensaio de Giro foi detectado tempo ocioso no primeiro frame. Corrigido descartando o primeiro delta de início/retomada; vitória rápida repetida após correção. Pausa permaneceu no pulso zero; seta no modal não avançou. Retomada com comando externo chegou exatamente ao pulso 1/pista 3 antes de nova pausa.
- Derrota real por nó aos três pulsos. Derrota real por fio esgotado aos 180 pulsos em Treino. Reinício e saída do modal para escolher outra trama/ritmo conferidos.
- Avesso concluído pelos botões em viewport 390 × 844: 69 pulsos, 1062 pontos. Sem overflow horizontal, Canvas 343 px e botões direcionais com aproximadamente 77 px de altura. Ajuste de rolagem móvel verificado: disco começa em y≈0 e controles terminam em y≈571, ambos no viewport.
- Sem jogo em telefone físico, teclado virtual/IME, gamepad ou avaliação auditiva humana.

## Segurança e publicação

Hospedagem estática de repositório público no GitHub Pages, disponível no GitHub Free: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages . Sem cartão, trial, API remota, conta adicional ou serviço com consumo faturável. Preferências e recordes são locais; não há dados pessoais ou credenciais de demonstração.

Scanner, histórico, clone remoto, autoria, CI e artefato público serão registrados após publicação.

## Limites

Não foi executada auditoria integral de leitor de tela ou Safari. O mapa em texto apoia o Treino, sem promessa de equivalência plena do arcade em tempo real. Código trata blur/visibility/BFCache, mas a troca física de foco não foi comprovada em todos os navegadores. As colisões são em casas, não interseções contínuas entre traços. Seeds fixas e rotas demonstram vencibilidade, não que qualquer jogada continue recuperável nem diversão medida com pessoas independentes. Sem save de rodada, ranking confiável, sincronização ou garantia offline. Scans/testes não constituem garantia de invulnerabilidade.
