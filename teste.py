def gcd(a, b):
    while b != 0:
        a, b = b, a % b
    return a

def modinv(e, phi):
    d, x1, x2, y1 = 0, 0, 1, 1
    original_phi = phi
    while e > 0:
        q = phi // e
        phi, e = e, phi % e
        x1, x2 = x2 - q * x1, x1
        y1, d = d - q * y1, y1
    return d % original_phi

def fat(n1o):
    n1s = [1]
    n1c = n1o
    n1a = 2

    while n1a <= n1o:
        if n1c % n1a == 0:
            n1c = n1c / n1a
            if not n1a in n1s:
                n1s.append(n1a)

            if n1c % n1a != 0:
                n1a += 1

        else:
            n1a += 1

    return n1s

def fat2(n1, n2):

    fat1 = fat(n1)
    fat2 = fat(n2)

    p = 3

    while p % 2 == 0 or len(fat(p)) > 2 or p in fat1 or p in fat2:
        p += 1

    return p

# ----- Chaves RSA pequenas (apenas para demonstração) -----
p = 1019
q = 1021
n = p * q             # n = 391
e = fat2(p - 1, q - 1)

print(n, p-1, q-1,  e)

phi = (p - 1) * (q - 1)  # φ(n) = 352

assert gcd(e, phi) == 1
d = modinv(e, phi)

v = 12
# ----- Mensagem original -----
mensagem_original = pow(2, v - 1) | 1300
c = pow(mensagem_original, e, n)
print(f"Mensagem original criptografada: {c}")
print(pow(2, v) - 1, mensagem_original)
# ----- Ataque de força bruta -----
def tentativa_ataque_forca_bruta(c, n, max_m=pow(2, v) - 1):
    possiveis_e = [3, 5, 7, 17, 257, 65537]  # valores comuns de e no RSA

    t = 0
    for e in possiveis_e:
        print(f"Tentando com e = {e}...")

        for m in range(max_m + 1):
            t += 1
            if pow(m, e, n) == c:
                print(f"\n🔓 Mensagem encontrada!")
                print(f"e = {e}")
                print(f"Mensagem original = {m & ~ pow(2, v - 1)}")
                print(t)
                return m, e
    print("❌ Nenhuma mensagem encontrada com os valores testados.")
    return None, None

mensagem, e_usado = tentativa_ataque_forca_bruta(c, n)