// Garde les paramètres et l'ancre de l'ancien lien (la balise meta refresh les perd).
// Script dans un fichier à part pour rester compatible avec une politique de sécurité (CSP) stricte.
location.replace('../blocs/' + location.search + location.hash);
