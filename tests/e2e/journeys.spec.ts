import { expect, test, type Page } from "@playwright/test";

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

async function signUp(page: Page, next?: string) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@exemplo.com`;
  await page.goto(next ? `/cadastro?next=${encodeURIComponent(next)}` : "/cadastro");
  await page.getByLabel("Como podemos te chamar?").fill("Marina Teste");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senhaforte123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  return email;
}

test("Jornada A — consultar um voo sem conta", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Seu voo, sem surpresas.");
  await page
    .getByPlaceholder(/Número do voo/)
    .first()
    .fill("zz1010");
  await page.getByRole("button", { name: "Buscar" }).first().click();
  await expect(page).toHaveURL(/\/voos\?numero=ZZ1010/);
  await expect(page.getByRole("heading", { name: "2 voos encontrados" })).toBeVisible();
  await page.getByRole("link", { name: /ZZ1010[\s\S]*18:30/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "ZZ1010" })).toBeVisible();
  await expect(page.getByText("Demonstração").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Linha do tempo" })).toBeVisible();
  await expect(page.getByText(/Ligação ilustrativa/)).toBeVisible();
});

test("busca inválida e sem resultados mostram mensagens claras", async ({ page }) => {
  await page.goto("/voos");
  await page.getByPlaceholder(/Número do voo/).fill("123");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText(/Use o código da companhia/)).toBeVisible();
  await page.goto(`/voos?numero=ZZ9999&data=${today()}`);
  await expect(page.getByText(/Nenhum voo encontrado/)).toBeVisible();
});

test("cancelamento exibe orientação ao passageiro sem prometer indenização", async ({ page }) => {
  await page.goto(`/voos?numero=ZZ1005&data=${today()}`);
  await page.getByRole("link", { name: /ZZ1005/ }).click();
  await expect(page.getByText("Cancelado").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Orientação ao passageiro" })).toBeVisible();
  await expect(page.getByText(/não avalia nem garante ressarcimento/)).toBeVisible();
});

test("Jornadas B e D — acompanhar, receber alerta, compartilhar e revogar", async ({
  page,
  context,
}) => {
  const slug = `/voos/demo.ZZ1002-${today().replaceAll("-", "")}`;
  await page.goto(slug);
  await page.getByRole("link", { name: "Entrar para acompanhar" }).click();
  await expect(page).toHaveURL(/\/entrar\?next=/);
  await page.getByRole("link", { name: "Criar conta" }).last().click();
  await page.getByLabel("Como podemos te chamar?").fill("Marina Teste");
  await page.getByLabel("E-mail").fill(`e2e-b-${Date.now()}@exemplo.com`);
  await page.getByLabel("Senha").fill("senhaforte123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(new RegExp(slug));

  await page.getByRole("button", { name: "Acompanhar voo" }).click();
  await expect(page.getByText("Você acompanha este voo")).toBeVisible();

  await page.goto("/app/alertas");
  await expect(page.getByText("ZZ1002 · Partida prevista após o horário programado")).toBeVisible();

  await page.goto(slug);
  await page.getByRole("button", { name: "Criar link" }).click();
  const linkInput = page.getByLabel("Link de compartilhamento");
  await expect(linkInput).toBeVisible();
  const url = await linkInput.inputValue();
  expect(url).toMatch(/\/compartilhado\//);

  const guest = await context.browser()!.newContext();
  const g = await guest.newPage();
  await g.goto(url);
  await expect(g.getByText("Alguém compartilhou com você")).toBeVisible();
  await expect(g.getByText("Marina")).toHaveCount(0);

  await page.reload();
  await page.getByRole("button", { name: "Revogar" }).click();
  await expect(page.getByText("Revogado")).toBeVisible();
  await g.reload();
  await expect(g.getByRole("heading", { name: "Link indisponível" })).toBeVisible();
  await guest.close();
});

test("Jornada C — criar viagem, roteiro, despesa e bagagem persistidos", async ({ page }) => {
  await signUp(page, "/app/viagens/nova");
  await expect(page).toHaveURL(/\/app\/viagens\/nova/);
  await page.getByLabel("Nome da viagem").fill("Férias em Lisboa");
  await page.getByLabel("Destino principal").fill("Lisboa");
  await page.getByLabel("País").fill("Portugal");
  await page.getByLabel("Ida").fill("2026-12-10");
  await page.getByLabel("Volta").fill("2026-12-14");
  await page.getByLabel("Orçamento estimado").fill("12.000,00");
  await page.getByRole("button", { name: "Criar viagem" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Férias em Lisboa" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "Seções da viagem" })
    .getByRole("link", { name: "Roteiro", exact: true })
    .click();
  await page.getByLabel("Atividade", { exact: true }).fill("Mosteiro dos Jerónimos");
  await page.getByLabel("Dia", { exact: true }).fill("2026-12-11");
  await page.getByLabel(/^Início/).fill("11:00");
  await page.getByRole("button", { name: "Adicionar ao roteiro" }).click();
  await expect(page.getByText("Mosteiro dos Jerónimos")).toBeVisible();

  await page
    .getByRole("navigation", { name: "Seções da viagem" })
    .getByRole("link", { name: "Orçamento", exact: true })
    .click();
  await page.getByLabel("Descrição", { exact: true }).fill("Hotel em Alfama");
  await page.getByLabel("Categoria", { exact: true }).selectOption("lodging");
  await page.getByLabel(/^Gasto/).fill("3.500,00");
  await page.getByRole("button", { name: "Registrar despesa" }).click();
  await expect(page.getByRole("cell", { name: /Hotel em Alfama/ }).first()).toBeVisible();
  await expect(page.getByText("R$ 8.500,00").first()).toBeVisible(); // saldo

  await page
    .getByRole("navigation", { name: "Seções da viagem" })
    .getByRole("link", { name: "Bagagem", exact: true })
    .click();
  await page.getByLabel("Novo item", { exact: true }).fill("Adaptador de tomada");
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  const item = page.getByRole("checkbox", { name: "Adaptador de tomada" });
  await expect(item).toHaveAttribute("aria-checked", "false");
  await item.click();
  await expect(page.getByRole("checkbox", { name: "Adaptador de tomada" })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Adaptador de tomada" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.goto("/app/viagens");
  await expect(page.getByRole("link", { name: /Férias em Lisboa/ })).toBeVisible();
});

test("Jornada E — passaporte vazio e área protegida", async ({ page }) => {
  await page.goto("/app/passaporte");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fapp%2Fpassaporte/);
  await signUp(page, "/app/passaporte");
  await expect(page.getByRole("heading", { name: "Meu Passaporte" })).toBeVisible();
  await expect(page.getByText("Seu passaporte ainda está em branco")).toBeVisible();
});

test("sem overflow horizontal nas páginas principais", async ({ page }) => {
  for (const p of [
    "/",
    "/voos",
    `/voos/demo.ZZ1004-${today().replaceAll("-", "")}`,
    "/aeroportos",
    "/aeroportos/gru",
    "/planos",
  ]) {
    await page.goto(p);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, p).toBeLessThanOrEqual(1);
  }
});
