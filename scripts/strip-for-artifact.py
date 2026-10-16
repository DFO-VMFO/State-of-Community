import sys
s=open('dist-single/index.html').read()
for t in ['<!doctype html>\n','<html lang="en">\n','  <head>\n']: s=s.replace(t,'',1)
i=s.rindex('  </head>'); s=s[:i]+s[i:].replace('  </head>\n','',1).replace('  <body>','',1).replace('</body>\n</html>\n','',1)
s=s.replace('</title>','</title><style>html,body{background:#F1F3EF;color:#17201E}</style>',1)
open(sys.argv[1],'w').write(s)
