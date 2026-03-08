interface LegalPageProps {
  type: "terms" | "privacy";
}

export function LegalPage({ type }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-6 py-14 md:py-18 space-y-8">
        <header className="space-y-3 border-b border-line pb-8">
          <a href="/" className="text-sm text-content-3 hover:text-content transition-colors">
            ← Voltar
          </a>
          <h1 className="text-3xl font-light text-content tracking-tight md:text-4xl">
            {type === "terms" ? "Termos de Serviço" : "Política de Privacidade"}
          </h1>
          <p className="text-sm text-content-3">Última atualização: 7 de março de 2026</p>
        </header>

        <article className="prose-legal space-y-6 text-content-2 leading-relaxed text-[15px]">
          {type === "privacy" ? <PrivacyContent /> : <TermsContent />}
        </article>

        <footer className="border-t border-line pt-6 text-sm text-content-3">
          <a
            href={type === "terms" ? "/privacy" : "/terms"}
            className="underline underline-offset-4 hover:text-content transition-colors"
          >
            {type === "terms" ? "Política de Privacidade" : "Termos de Serviço"}
          </a>
        </footer>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-medium text-content mt-8 mb-3">{children}</h2>;
}

function PrivacyContent() {
  return (
    <>
      <p>
        Esta Política de Privacidade descreve como o <strong className="text-content">Teq</strong> ("nós", "nosso"),
        desenvolvido por Pedro Durand, coleta, usa, armazena e protege as informações pessoais dos
        usuários ("você") ao utilizar nosso aplicativo e serviços.
      </p>

      <SectionTitle>1. Dados que coletamos</SectionTitle>
      <p>Ao usar o Teq, podemos coletar os seguintes dados:</p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong className="text-content">Dados de cadastro:</strong> nome, e-mail, nome de usuário, data de nascimento e número de telefone (WhatsApp).</li>
        <li><strong className="text-content">Dados de autenticação:</strong> senha (armazenada com hash seguro), tokens de sessão e dados de login via Google OAuth.</li>
        <li><strong className="text-content">Dados de uso:</strong> mensagens de texto e áudio enviadas ao agente, histórico de conversas, tarefas criadas, lembretes e memórias salvas pelo agente.</li>
        <li><strong className="text-content">Dados de integrações:</strong> quando você conecta serviços externos (como Gmail ou Google Calendar), armazenamos tokens de acesso para que o agente possa operar em seu nome. Não armazenamos o conteúdo dos seus e-mails ou eventos — apenas os acessamos em tempo real quando você solicita.</li>
        <li><strong className="text-content">Dados técnicos:</strong> endereço IP, tipo de dispositivo e informações de navegador para fins de segurança e diagnóstico.</li>
      </ul>

      <SectionTitle>2. Como usamos seus dados</SectionTitle>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Fornecer e personalizar os serviços do Teq (assistente pessoal de IA).</li>
        <li>Autenticar sua identidade e proteger sua conta.</li>
        <li>Enviar mensagens proativas (lembretes, agendamentos) pelos canais que você configurar.</li>
        <li>Acessar serviços integrados (Gmail, Google Calendar) sob sua autorização explícita.</li>
        <li>Melhorar a qualidade do serviço e corrigir problemas técnicos.</li>
      </ul>

      <SectionTitle>3. Integrações com terceiros</SectionTitle>
      <p>O Teq pode se integrar com serviços de terceiros mediante sua autorização explícita:</p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong className="text-content">Google (Gmail e Calendar):</strong> usamos OAuth 2.0 para obter acesso limitado e revogável à sua conta. Os escopos solicitados são apenas os necessários para a funcionalidade (leitura de e-mails, leitura e criação de eventos). Você pode revogar o acesso a qualquer momento em Configurações &gt; Integrações.</li>
        <li><strong className="text-content">WhatsApp (Meta):</strong> usado como canal de comunicação. Processamos mensagens recebidas para gerar respostas do agente.</li>
        <li><strong className="text-content">Cloudinary:</strong> imagens enviadas ou geradas são armazenadas neste serviço de hospedagem de mídia.</li>
      </ul>

      <SectionTitle>4. Armazenamento e segurança</SectionTitle>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Seus dados são armazenados em servidores seguros com criptografia em trânsito (HTTPS/TLS).</li>
        <li>Senhas são armazenadas com hash bcrypt — nunca em texto puro.</li>
        <li>Tokens de acesso de integrações são armazenados de forma segura no banco de dados.</li>
        <li>O acesso aos dados é restrito à equipe de desenvolvimento e não é compartilhado com terceiros para fins comerciais.</li>
      </ul>

      <SectionTitle>5. Seus direitos (LGPD)</SectionTitle>
      <p>Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), você tem direito a:</p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Acessar seus dados pessoais armazenados.</li>
        <li>Corrigir dados incompletos ou incorretos.</li>
        <li>Solicitar a exclusão dos seus dados.</li>
        <li>Revogar consentimento de integrações a qualquer momento.</li>
        <li>Solicitar portabilidade dos seus dados.</li>
      </ul>
      <p>
        Para exercer qualquer desses direitos, entre em contato pelo e-mail:{" "}
        <a href="mailto:contato@diarioteq.com" className="underline underline-offset-4 text-content hover:opacity-80">
          contato@diarioteq.com
        </a>
      </p>

      <SectionTitle>6. Cookies</SectionTitle>
      <p>
        O aplicativo web utiliza <code className="px-1.5 py-0.5 rounded bg-surface-card text-content text-sm">localStorage</code> para armazenar seu token de autenticação.
        Não utilizamos cookies de rastreamento ou publicidade.
      </p>

      <SectionTitle>7. Retenção de dados</SectionTitle>
      <p>
        Seus dados são mantidos enquanto sua conta estiver ativa. Ao solicitar a exclusão da conta,
        todos os dados pessoais serão removidos em até 30 dias.
      </p>

      <SectionTitle>8. Alterações nesta política</SectionTitle>
      <p>
        Podemos atualizar esta política periodicamente. Quando houver mudanças significativas,
        você será notificado dentro do aplicativo e precisará aceitar os novos termos para continuar usando o serviço.
      </p>

      <SectionTitle>9. Contato</SectionTitle>
      <p>
        Se tiver dúvidas sobre esta política, entre em contato:<br />
        <strong className="text-content">Pedro Durand</strong><br />
        E-mail:{" "}
        <a href="mailto:contato@diarioteq.com" className="underline underline-offset-4 text-content hover:opacity-80">
          contato@diarioteq.com
        </a>
      </p>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <p>
        Estes Termos de Serviço ("Termos") regem o uso do <strong className="text-content">Teq</strong>,
        um assistente pessoal de inteligência artificial desenvolvido por Pedro Durand.
        Ao criar uma conta ou utilizar o serviço, você concorda com estes Termos.
      </p>

      <SectionTitle>1. Descrição do serviço</SectionTitle>
      <p>
        O Teq é um assistente pessoal de IA que oferece funcionalidades como:
        conversação inteligente, gerenciamento de tarefas e lembretes, pesquisa na web,
        geração e edição de imagens, publicação em blog, e integração com serviços externos
        (Gmail, Google Calendar) mediante autorização do usuário.
      </p>

      <SectionTitle>2. Elegibilidade</SectionTitle>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Você deve ter pelo menos 13 anos para usar o Teq.</li>
        <li>Ao se cadastrar, você declara que as informações fornecidas são verdadeiras.</li>
        <li>Você é responsável por manter a segurança da sua conta e senha.</li>
      </ul>

      <SectionTitle>3. Uso aceitável</SectionTitle>
      <p>Ao usar o Teq, você concorda em não:</p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Usar o serviço para atividades ilegais ou prejudiciais.</li>
        <li>Tentar acessar dados de outros usuários.</li>
        <li>Enviar conteúdo que viole direitos de terceiros.</li>
        <li>Realizar engenharia reversa ou explorar vulnerabilidades do sistema.</li>
        <li>Usar o serviço para spam ou envio em massa de mensagens.</li>
      </ul>

      <SectionTitle>4. Integrações com terceiros</SectionTitle>
      <p>
        O Teq permite conectar serviços externos (como Google Gmail e Calendar) para
        ampliar suas funcionalidades. Ao autorizar uma integração:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Você concede ao Teq permissão para acessar os dados do serviço nos escopos autorizados.</li>
        <li>Você pode revogar o acesso a qualquer momento em Configurações &gt; Integrações.</li>
        <li>O Teq não se responsabiliza por alterações nos termos ou disponibilidade dos serviços de terceiros.</li>
      </ul>

      <SectionTitle>5. Conteúdo gerado por IA</SectionTitle>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>As respostas do Teq são geradas por modelos de inteligência artificial e podem conter erros ou imprecisões.</li>
        <li>O Teq não substitui aconselhamento profissional (jurídico, médico, financeiro, etc.).</li>
        <li>Você é responsável por verificar informações críticas antes de agir com base nelas.</li>
      </ul>

      <SectionTitle>6. Planos e pagamento</SectionTitle>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>O Teq oferece um período de teste gratuito de 7 dias para novos usuários.</li>
        <li>Após o período de teste, é necessário assinar um plano pago para continuar usando.</li>
        <li>Os pagamentos são processados via Stripe. Os detalhes do plano e preços estão disponíveis no aplicativo.</li>
        <li>Você pode cancelar sua assinatura a qualquer momento. O acesso continua até o final do período pago.</li>
      </ul>

      <SectionTitle>7. Disponibilidade do serviço</SectionTitle>
      <p>
        Nos esforçamos para manter o Teq disponível, mas não garantimos disponibilidade
        ininterrupta. O serviço pode ficar temporariamente indisponível para manutenção,
        atualizações ou por motivos fora do nosso controle.
      </p>

      <SectionTitle>8. Propriedade intelectual</SectionTitle>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>O Teq e seu código-fonte são propriedade de Pedro Durand.</li>
        <li>O conteúdo que você cria através do Teq (textos, imagens, posts) pertence a você.</li>
        <li>Ao usar o serviço, você nos concede uma licença limitada para processar seu conteúdo apenas para fins de prestação do serviço.</li>
      </ul>

      <SectionTitle>9. Limitação de responsabilidade</SectionTitle>
      <p>O Teq é fornecido "como está". Não nos responsabilizamos por:</p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Perdas decorrentes de informações geradas pela IA.</li>
        <li>Ações realizadas por integrações autorizadas pelo usuário.</li>
        <li>Indisponibilidade temporária do serviço.</li>
        <li>Problemas causados por serviços de terceiros integrados.</li>
      </ul>

      <SectionTitle>10. Encerramento</SectionTitle>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Você pode excluir sua conta a qualquer momento.</li>
        <li>Reservamo-nos o direito de suspender ou encerrar contas que violem estes Termos.</li>
        <li>Ao encerrar a conta, seus dados serão removidos conforme nossa Política de Privacidade.</li>
      </ul>

      <SectionTitle>11. Alterações nos termos</SectionTitle>
      <p>
        Podemos atualizar estes Termos periodicamente. Quando houver mudanças significativas,
        você será notificado dentro do aplicativo e precisará aceitar os novos termos para
        continuar usando o serviço.
      </p>

      <SectionTitle>12. Legislação aplicável</SectionTitle>
      <p>
        Estes Termos são regidos pelas leis da República Federativa do Brasil.
        Qualquer disputa será resolvida no foro da comarca do domicílio do usuário.
      </p>

      <SectionTitle>13. Contato</SectionTitle>
      <p>
        Se tiver dúvidas sobre estes Termos, entre em contato:<br />
        <strong className="text-content">Pedro Durand</strong><br />
        E-mail:{" "}
        <a href="mailto:contato@diarioteq.com" className="underline underline-offset-4 text-content hover:opacity-80">
          contato@diarioteq.com
        </a>
      </p>
    </>
  );
}
