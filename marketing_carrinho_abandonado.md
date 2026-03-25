# 🛒 Estratégia de Recuperação de Carrinho & Upsell (Plano de Fuga)

Este documento contém os **Templates Oficiais de Copywriting Cativante** para você plugar na sua ferramenta de e-mail marketing (ex: ActiveCampaign, Mailchimp, Resend) ou no próprio sistema nativo do Stripe.

---

## 📅 E-mail 1: O Lembrete Urgente (Envio: 1h após abandono)
**Objetivo:** Aguçar a curiosidade e o medo de perder (FOMO) o acesso ao roteiro detalhado.

**Assunto:** Seu Roteiro Secreto para [Destino] está expirando... ⏳
**Pré-header (Preview Text):** Nós salvamos o Dia 2 e o Guia Exclusivo para você, mas não por muito tempo.

> Olá [Nome do Viajante],
> 
> A nossa Inteligência Artificial acabou de montar um plano de fuga espetacular para você em **[Destino]**, e nós guardamos a chave do cofre. 🔐
> 
> Notei que você espiou o **Dia 1**, mas parou exatamente na melhor parte. 
> Sabe aqueles restaurantes escondidos que só os moradores conhecem? E aquele "Plano B" salvador caso alguma atração esteja lotada? Tudo isso está pronto e esperando por você no seu Roteiro Premium.
> 
> Falta apenas um clique para você não viajar como um turista comum. 
> 
> 👉 **[BOTÃO: DESBLOQUEAR MEU ROTEIRO COMPLETO AGORA]**
> 
> *Ps: Não deixe a viagem dos seus sonhos virar fumaça. Seu roteiro salvo ficará disponível apenas pelas próximas horas.*
> 
> Boa fuga,
> **Equipe Plano de Fuga**

---

## 📅 E-mail 2: O Agregador de Valor (Envio: 24h após abandono)
**Objetivo:** Provocar a dor (dinheiro gasto à toa) e oferecer a "cura" (certeza de um E-book guia perfeito).

**Assunto:** Quanto custa uma viagem arruinada em [Destino]? 💸
**Pré-header (Preview Text):** O preço de não ter um planejamento estratégico pode sair caro.

> Ei [Nome do Viajante], tudo bem?
> 
> Viajar para **[Destino]** é um investimento alto de energia, tempo e muito dinheiro. E você sabia que o maior erro de 80% dos viajantes é chegar no destino e descobrir que a atração dos sonhos esgotou? Ou pagar $50 dólares num almoço que não vale $10?
> 
> O **Plano de Fuga Premium** não é apenas um cronograma. Nosso algoritmo cruzou milhares de dados para lhe entregar:
> 
> 🌤️ A Previsão do Tempo Dinâmica para a sua data exata.
> 🔋 O Pacing de Energia (para você não voltar mais cansado do que foi).
> ☔ O "Plano B" para qualquer dia de chuva.
> 📕 O E-book Confidencial com os hacks locais.
> 
> Desbloqueie sua tranquilidade. O planejamento inteligente se paga logo no primeiro dia de viagem.
> 
> 👉 **[BOTÃO: VER PLANOS E ACESSAR MEUS MATERIAIS]**
> 
> Te vejo lá,
> **Equipe Plano de Fuga**

---

## 📅 E-mail 3: O Desconto Irresistível / O Ultimato (Envio: 3 dias após abandono)
**Objetivo:** Eliminar a barreira do preço e incentivar a compra por impulso.

**Assunto:** 🎁 Destrancamos um presente para a sua fuga!
**Pré-header (Preview Text):** Última chance: 20% OFF no seu passaporte Premium.

> [Nome do Viajante],
> 
> Sei que o momento de planejar uma viagem pode ser corrido, por isso vou facilitar as coisas para você.
> 
> O roteiro confidencial que criamos para a sua fuga está prestes a ser apagado do nosso servidor, mas como queremos MUITO que você tenha a melhor experiência possível, consegui liberar um voucher de **20% de Desconto**.
> 
> Use o código **FUGA20** na página de pagamento e acesse agora mesmo.
> 
> 👉 **[BOTÃO: RESGATAR MEUS 20% OFF E VER O ROTEIRO]**
> 
> Mas atenção: Esse código é válido somente pelas próximas 24 horas.
> É a sua chance definitiva de viajar como um verdadeiro Insider.
> 
> Um abraço,
> **Equipe Plano de Fuga**

---

### ⚙️ Instrução de Implementação Técnica:
Se você utiliza a **Stripe** para processar pagamentos:
1. Vá no seu Dashboard da Stripe > Configurações > E-mails (Customer Emails).
2. Ative a opção: **"Enviar lembretes aos clientes sobre links de pagamento expirados ou abandonados"**.
3. A própria Stripe fará o trabalho de recuperação automaticamente!

Para automatizar no seu E-mail Marketing, você pode criar uma integração pelo **Make.com** ou **Zapier** capturando as inserções no `Supabase` quando a conta for criada ou quando os limites gratuitos forem atingidos.
