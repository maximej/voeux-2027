// Anciens liens vers la carte « Relie les points » (?d=, ?msg=, ?n=) : on les envoie vers /points/.
// Script dans un fichier à part (et non dans la page) pour rester compatible avec une politique de sécurité (CSP) stricte.
if (/[?&](d|msg|n)=/.test(location.search)) location.replace('points/' + location.search);
