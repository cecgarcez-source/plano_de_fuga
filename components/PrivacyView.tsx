import React from 'react';

interface PrivacyViewProps {
    onBack: () => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({ onBack }) => {
    return (
        <div className="w-full max-w-4xl bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-8 animate-fade-in text-gray-800">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h1 className="text-3xl font-bold text-teal-800">Política de Privacidade</h1>
                <button
                    onClick={onBack}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                    Voltar
                </button>
            </div>

            <div className="prose prose-teal max-w-none">
                <p className="text-sm text-gray-500 mb-4">Última atualização: {new Date().toLocaleDateString()}</p>

                <p>
                    A sua privacidade é importante para nós. É política do <strong>Plano de Fuga AI</strong> respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site <a href="https://planodefugai.com.br">Plano de Fuga AI</a>, e outros sites que possuímos e operamos.
                </p>

                <h3>1. Informações que coletamos</h3>
                <p>
                    Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.
                </p>
                <p>
                    Os dados que coletamos incluem, mas não se limitam a:
                </p>
                <ul>
                    <li>Nome e e-mail (para criação de conta e personalização);</li>
                    <li>Preferências de viagem (para geração de roteiros);</li>
                    <li>Histórico de roteiros salvos.</li>
                </ul>

                <h3>2. Uso das informações</h3>
                <p>
                    Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis ​​para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.
                </p>
                <p>
                    Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei ou para processamento de pagamentos seguros (Stripe).
                </p>

                <h3>3. Inteligência Artificial (Gemini AI)</h3>
                <p>
                    Para gerar seus roteiros, enviamos suas preferências de viagem de forma anônima (sem seu nome ou e-mail, apenas os dados de preferência) para a API do Google Gemini.
                </p>

                <h3>4. Compromisso do Usuário</h3>
                <p>
                    O usuário se compromete a fazer uso adequado dos conteúdos e da informação que o Plano de Fuga AI oferece no site e com caráter enunciativo, mas não limitativo:
                </p>
                <ul>
                    <li>A) Não se envolver em atividades que sejam ilegais ou contrárias à boa fé a à ordem pública;</li>
                    <li>B) Não difundir propaganda ou conteúdo de natureza racista, xenofóbica, ou azar, qualquer tipo de pornografia ilegal, de apologia ao terrorismo ou contra os direitos humanos;</li>
                    <li>C) Não causar danos aos sistemas físicos (hardwares) e lógicos (softwares) do Plano de Fuga AI, de seus fornecedores ou terceiros.</li>
                </ul>

                <h3>5. Mais informações</h3>
                <p>
                    Esperemos que esteja esclarecido e, como mencionado anteriormente, se houver algo que você não tem certeza se precisa ou não, geralmente é mais seguro deixar os cookies ativados, caso interaja com um dos recursos que você usa em nosso site.
                </p>
            </div>

            <div className="mt-8 pt-6 border-t flex justify-center">
                <button
                    onClick={onBack}
                    className="text-teal-600 hover:text-teal-800 font-semibold underline"
                >
                    Voltar para a página inicial
                </button>
            </div>
        </div>
    );
};
