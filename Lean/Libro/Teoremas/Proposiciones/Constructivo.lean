variable (p q r : Prop) 

-- conmutatividad de ∧ y ∨ 
example : p ∧ q ↔ q ∧ p := 
  Iff.intro 
    (fun hpq : p ∧ q => And.intro hpq.right hpq.left)
    (fun hqp : q ∧ p => And.intro hqp.right hqp.left)

example : p ∨ q ↔ q ∨ p := 
    Iff.intro 
      (fun hpq : p ∨ q => 
        Or.elim  hpq 
          (fun hp : p => Or.intro_right q hp)
          (fun hq : q => Or.intro_left p hq))
      (fun hqp : q ∨ p =>
        Or.elim hqp 
          (fun hq : q => Or.intro_right p hq)
          (fun hp : p => Or.intro_left q hp))

-- asociatividad de ∧ y ∨ 
example : (p ∧ q) ∧ r ↔ p ∧ (q ∧ r) := 
  Iff.intro 
    (fun hpqr : ((p ∧ q) ∧ r) => 
      And.intro (hpqr.left.left) (And.intro hpqr.left.right hpqr.right))
    (fun hpqr : (p ∧ (q ∧ r)) => 
      And.intro (And.intro hpqr.left hpqr.right.left) hpqr.right.right)

example : (p ∨ q) ∨ r ↔ p ∨ (q ∨ r) := 
    Iff.intro 
      (fun hpqr : (p ∨ q) ∨ r => 
        Or.elim hpqr
        (fun hpq : p ∨ q => 
          Or.elim hpq 
            (fun hp : p => Or.intro_left (q ∨ r) hp)
            (fun hq : q => Or.intro_right p (Or.intro_left r hq)))
        (fun hr : r => Or.intro_right p (Or.intro_right q hr))) 
      (fun hpqr : p ∨ (q ∨ r) => 
        Or.elim hpqr 
        (fun hp : p => Or.intro_left r (Or.intro_left q hp))
        (fun hqr : q ∨ r => 
          Or.elim hqr 
          (fun hq : q => Or.intro_left r (Or.intro_right p hq))
          (fun hr : r => Or.intro_right (p ∨ q) hr)))


-- distributividad 
example : p ∧ (q ∨ r) ↔ (p ∧ q) ∨ (p ∧ r) := 
  Iff.intro 
    (fun hpqr : p ∧ (q ∨ r) => 
      ))

