// Este é o seu arquivo JavaScript principal (ex: script.js)

// --- 1. Registro do Service Worker ---
// Garante que o Service Worker seja registrado assim que a página carregar
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/service-worker.js')
      .then(function(registration) {
        console.log('Service Worker registrado com sucesso:', registration.scope);

        // Opcional: Solicitar permissão para notificações push
        if ('Notification' in window && Notification.permission !== 'granted') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              console.log('Permissão para notificações concedida!');
              // Se você tiver um backend, aqui você enviaria o pushSubscription para ele
              // registration.pushManager.subscribe({ userVisibleOnly: true }).then(subscription => {
              //   console.log('Push Subscription:', JSON.stringify(subscription));
              //   // Envie a subscription para o seu servidor
              // });
            } else {
              console.warn('Permissão para notificações negada.');
            }
          });
        }

        // Opcional: Registrar Periodic Background Sync (Requer permissão de notificação em alguns navegadores)
        if ('periodicSync' in registration) {
          navigator.permissions.query({ name: 'periodic-background-sync' }).then(status => {
            if (status.state === 'granted') {
              registration.periodicSync.register('eldex-periodic-sync', {
                minInterval: 24 * 60 * 60 * 1000, // Exemplo: a cada 24 horas (em milissegundos)
              })
              .then(() => console.log('Periodic Sync registrado!'))
              .catch(error => console.error('Falha ao registrar Periodic Sync:', error));
            } else {
              console.warn('Permissão para Periodic Background Sync não concedida.');
            }
          });
        }
      })
      .catch(function(error) {
        console.error('Falha ao registrar o Service Worker:', error);
      });
  });
}

// --- 2. Função para salvar ações offline e registrar a sincronização ---
// Esta função é chamada pelo seu aplicativo quando uma ação precisa ser salva
// e sincronizada mais tarde (se o usuário estiver offline).
function saveOfflineAction(data) {
  // --- LÓGICA DE ARMAZENAMENTO LOCAL ---
  // Aqui é onde você salva os dados localmente. É crucial que esses dados
  // persistam mesmo se o navegador for fechado. IndexedDB é o ideal para isso,
  // mas usaremos localStorage para simplicidade no exemplo.
  try {
    // Carrega ações pendentes existentes ou inicializa um array vazio
    const actionsToSync = JSON.parse(localStorage.getItem('pending-actions') || '[]');
    actionsToSync.push(data); // Adiciona a nova ação
    localStorage.setItem('pending-actions', JSON.stringify(actionsToSync)); // Salva de volta
    console.log('Dados salvos localmente (pending-actions):', data);

    // Você pode mostrar uma mensagem ao usuário que os dados foram salvos offline
    // Não use 'alert()' em produção, use um modal ou toast personalizado.
    // alert('Ação salva localmente. Será sincronizada quando a conexão for restaurada.');

  } catch (e) {
    console.error('Erro ao salvar dados no localStorage:', e);
    // alert('Erro ao salvar dados localmente. Por favor, tente novamente.');
    return; // Sai da função se houver erro ao salvar localmente
  }
  // --- FIM DA LÓGICA DE ARMAZENAMENTO LOCAL ---


  // Verifica se o Service Worker e a API de Sincronização em Segundo Plano são suportados
  if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
    navigator.serviceWorker.ready.then(registration => {
      // Registra uma sincronização em segundo plano com a tag 'eldex-sync'
      // Isso informa ao Service Worker para executar a função `syncUserData`
      // quando a conexão com a internet for restaurada.
      registration.sync.register('eldex-sync')
        .then(() => {
          console.log('Sincronização em segundo plano registrada com sucesso.');
          // Opcional: Envia uma mensagem para o Service Worker (se ele precisar de algo imediato)
          if (registration.active) {
            registration.active.postMessage({ type: 'DATA_PENDING_SYNC' });
          }
        })
        .catch(error => {
          console.error('Falha ao registrar a sincronização em segundo plano:', error);
          // alert('Falha ao registrar a sincronização em segundo plano. Verifique sua conexão.');
        });
    });
  } else {
    // Caso o navegador não suporte a sincronização em segundo plano,
    // você pode tentar enviar os dados imediatamente ou avisar o usuário.
    console.log('Sincronização em segundo plano não suportada por este navegador. Tentando enviar agora...');
    // Aqui você adicionaria uma lógica para tentar enviar os dados diretamente
    // ou informar ao usuário que a funcionalidade offline é limitada.
    // alert('Seu navegador não suporta sincronização offline completa. Por favor, tente quando estiver online.');
  }
}

// --- 3. Exemplo de como usar saveOfflineAction no seu aplicativo ---
// Imagine que você tem um botão ou um formulário para o usuário interagir.
document.addEventListener('DOMContentLoaded', () => {
  const saveButton = document.getElementById('save-data-button'); // Assumindo que você tem um botão com id="save-data-button"

  if (saveButton) {
    saveButton.addEventListener('click', () => {
      // Coleta os dados que você deseja salvar
      const tunerData = {
        id: Date.now(), // Um ID único para esta ação
        action: 'save_tuning_settings',
        settings: {
          instrument: 'guitar',
          tuning: ['E', 'A', 'D', 'G', 'B', 'e'],
          volume: 80
        },
        timestamp: new Date().toISOString()
      };

      // Chama a função para salvar a ação offline
      saveOfflineAction(tunerData);
      alert('Configurações salvas! Serão sincronizadas quando você estiver online.');
    });
  } else {
    console.warn('Botão com id "save-data-button" não encontrado. Adicione um para testar a função saveOfflineAction.');
  }

  // --- Opcional: Lidando com mensagens do Service Worker ---
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('Mensagem recebida do Service Worker:', event.data);
    if (event.data && event.data.type === 'SYNC_COMPLETE') {
      alert('Sincronização de dados concluída com sucesso!');
      // Você pode atualizar a UI aqui para refletir que os dados foram enviados
    }
  });

  // --- Outras lógicas do seu aplicativo Eldex Tuner viriam aqui ---
  // Por exemplo:
  // - Lógica para o microfone e análise de áudio
  // - Atualização da interface do usuário do afinador
  // - Funções para mudar instrumentos, afinações, etc.
  // ...
});
