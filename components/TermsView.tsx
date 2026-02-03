import React from 'react';

interface TermsViewProps {
    onBack: () => void;
}

export const TermsView: React.FC<TermsViewProps> = ({ onBack }) => {
    return (
        <div className="w-full max-w-4xl bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-8 animate-fade-in text-gray-800">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h1 className="text-3xl font-bold text-teal-800">Termos de Uso</h1>
                <button
                    onClick={onBack}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                    Voltar
                </button>
            </div>

            <div className="prose prose-teal max-w-none">
                <p className="text-sm text-gray-500 mb-4">Última atualização: {new Date().toLocaleDateString()}</p>

                <h3>1. Termos</h3>
                <p>
                    Ao acessar ao site <a href="https://planodefugai.com.br">Plano de Fuga AI</a>, concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis ​​e concorda que é responsável pelo cumprimento de todas as leis locais aplicáveis. Se você não concordar com algum desses termos, está proibido de usar ou acessar este site. Os materiais contidos neste site são protegidos pelas leis de direitos autorais e marcas comerciais aplicáveis.
                </p>

                <h3>2. Uso de Licença</h3>
                <p>
                    É concedida permissão para baixar temporariamente uma cópia dos materiais (informações ou software) no site Plano de Fuga AI , apenas para visualização transitória pessoal e não comercial. Esta é a concessão de uma licença, não uma transferência de título e, sob esta licença, você não pode:
                </p>
                <ol>
                    <li>modificar ou copiar os materiais;</li>
                    <li>usar os materiais para qualquer finalidade comercial ou para exibição pública (comercial ou não comercial);</li>
                    <li>tentar descompilar ou fazer engenharia reversa de qualquer software contido no site Plano de Fuga AI;</li>
                    <li>remover quaisquer direitos autorais ou outras notações de propriedade dos materiais; ou</li>
                    <li>transferir os materiais para outra pessoa ou 'espelhe' os materiais em qualquer outro servidor.</li>
                </ol>
                <p>
                    Esta licença será automaticamente rescindida se você violar alguma dessas restrições e poderá ser rescindida por Plano de Fuga AI a qualquer momento. Ao encerrar a visualização desses materiais ou após o término desta licença, você deve apagar todos os materiais baixados em sua posse, seja em formato eletrónico ou impresso.
                </p>

                <h3>3. Isenção de responsabilidade</h3>
                <ol>
                    <li>Os materiais no site da Plano de Fuga AI são fornecidos 'como estão'. Plano de Fuga AI não oferece garantias, expressas ou implícitas, e, por este meio, isenta e nega todas as outras garantias, incluindo, sem limitação, garantias implícitas ou condições de comercialização, adequação a um fim específico ou não violação de propriedade intelectual ou outra violação de direitos.</li>
                    <li>Além disso, o Plano de Fuga AI não garante ou faz qualquer representação relativa à precisão, aos resultados prováveis ​​ou à confiabilidade do uso dos materiais em seu site ou de outra forma relacionado a esses materiais ou em sites vinculados a este site.</li>
                    <li><strong>Importante:</strong> Os roteiros são gerados por Inteligência Artificial e podem conter imprecisões, preços desatualizados ou locais fechados. O usuário deve sempre verificar as informações críticas antes de viajar.</li>
                </ol>

                <h3>4. Limitações</h3>
                <p>
                    Em nenhum caso o Plano de Fuga AI ou seus fornecedores serão responsáveis ​​por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro ou devido a interrupção dos negócios) decorrentes do uso ou da incapacidade de usar os materiais em Plano de Fuga AI, mesmo que Plano de Fuga AI ou um representante autorizado da Plano de Fuga AI tenha sido notificado oralmente ou por escrito da possibilidade de tais danos.
                </p>

                <h3>5. Modificações</h3>
                <p>
                    O Plano de Fuga AI pode revisar estes termos de serviço do site a qualquer momento, sem aviso prévio. Ao usar este site, você concorda em ficar vinculado à versão atual desses termos de serviço.
                </p>

                <h3>Lei aplicável</h3>
                <p>
                    Estes termos e condições são regidos e interpretados de acordo com as leis do Brasil e você se submete irrevogavelmente à jurisdição exclusiva dos tribunais naquele estado ou localidade.
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
