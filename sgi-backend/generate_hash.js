const bcrypt = require('bcrypt');

const minhaSenhaAdmin = 'teste'; // <-- COLOQUE A SENHA QUE VOCÊ DESEJA AQUI
const saltRounds = 10; // O mesmo número de rounds que usaremos no backend

bcrypt.hash(minhaSenhaAdmin, saltRounds, function (err, hash) {
  if (err) {
    console.error("Erro ao gerar o hash:", err);
    return;
  }
  console.log("Senha original:", minhaSenhaAdmin);
  console.log("Senha Hasheada (para inserir no banco):", hash);
  console.log("\nUse o valor acima na sua instrução INSERT SQL.");
});