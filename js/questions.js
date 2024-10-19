let questions = [
    {
        question: `Halton Arp wrote an “Atlas” about  the peculiar type of these objects. A plot of angular velocity of these objects against radius appears roughly flat, which Vera Rubin hypothesized was from the density of dark matter. These things are placed on a diagram that diverges at the neck of a tuning fork. The Shapley-Curtis debate asked if more than one of them exists. These objects are organized into (*) clusters and have halos that contain globular clusters. The Large and Small Magellanic Clouds are examples of these objects. Their shapes may be lenticular, irregular, elliptical, or spiral. For 10 points, name these groupings of stars such as the Milky Way.`,
        answer: "galaxies"
    }, {
        question: `One  disease involving this structure is characterized by the appearance of ragged red fibers under a Gomori stain. The TIM/TOM complex manages translocation of proteins through it. This structure contains a membrane-embedded enzyme with a rotating stalk that is powered by the passage of protons through its F0 subunit down an (*) electrochemical gradient. The citric acid cycle occurs in its matrix. Its possession of its own, matrilineal DNA accords with the endosymbiotic theory of its origin. This organelle’s inner membrane is arranged in folds called cristae. For 10 points, name this organelle, the site of the vast majority of a cell’s ATP production.`,
        answer: "mitochondria"
    }, {
        question: `One  form of this phenomenon can be modeled by the Cornu Spiral, a parametric plot of two integrals of arc length. The Rayleigh Criterion limits the resolution of images produced by this phenomenon when light goes through a circular (*) aperture. Airy Disks and Newton's Rings are patterns formed by light undergoing this phenomenon, which has near-field and far-field types named for, respectively, Fresnel (fruh-NELL) and Fraunhofer (FRAUN-hoff-er). For 10 points, name this phenomenon in which light bends upon encountering a small obstacle.`,
        answer: "diffraction"
    }

]
let questionIndex = -1

export let randomQuestion = () => {
    let index = Math.floor(Math.random() * questions.length)
    while (index == questionIndex) {
        index = Math.floor(Math.random() * questions.length)
    }
    questionIndex = index
    return questions[index]
}
