<div class="max-w-2xl mx-auto p-6 space-y-6">
  <h2 class="text-2xl font-bold">About</h2>

  <h3 class="text-lg font-semibold">Model</h3>
  <p>This app fits a Bayesian logistic regression to a 2&times;2 factorial trial with a binary outcome (success/failure). The four arms are:</p>
  <ol class="list-decimal ml-6 space-y-1">
    <li><strong>ABX alone</strong> &mdash; antibiotics only (control)</li>
    <li><strong>Standard + ABX</strong> &mdash; standard care plus antibiotics</li>
    <li><strong>Treatment + ABX</strong> &mdash; new treatment plus antibiotics</li>
    <li><strong>Standard + Treatment + ABX</strong> &mdash; both standard care and new treatment plus antibiotics</li>
  </ol>
  <p>The model is:</p>
  <pre class="bg-gray-100 p-2 rounded text-sm overflow-x-auto">logit(p_i) = a + b1 &times; standard_care + b2 &times; treatment + b3 &times; (standard_care &times; treatment)</pre>
  <p>where <code>a</code> is the log-odds of success under ABX alone, <code>b1</code> is the effect of standard care, <code>b2</code> is the effect of the new treatment, and <code>b3</code> is the interaction between them.</p>
  <p>Two inference methods are available: <strong>Laplace approximation</strong> (IRLS to find the posterior mode, then multivariate normal sampling from the Hessian) and <strong>MCMC</strong> (Adaptive Metropolis-within-Gibbs via bayes.js).</p>

  <h3 class="text-lg font-semibold">ARR Calculations</h3>
  <p>For each posterior draw of (a, b1, b2, b3), we compute four arm success probabilities:</p>
  <ul class="list-disc ml-6 space-y-1">
    <li>p1 = logistic(a)</li>
    <li>p2 = logistic(a + b1)</li>
    <li>p3 = logistic(a + b2)</li>
    <li>p4 = logistic(a + b1 + b2 + b3)</li>
  </ul>
  <p>The two treatment comparisons are:</p>
  <ul class="list-disc ml-6 space-y-1">
    <li><strong>Treatment vs ABX alone:</strong> ARR = p3 &minus; p1</li>
    <li><strong>Treatment+Standard vs Standard:</strong> ARR = p4 &minus; p2</li>
  </ul>
  <p>P(ARR &gt; 0) is the fraction of posterior draws where the treatment arm has a higher success rate than the comparator.</p>

  <h3 class="text-lg font-semibold">Why b3 &gt; 0 Means Synergy</h3>
  <p>If b3 = 0, the effects of standard care and the new treatment are additive on the log-odds scale. <strong>b3 &gt; 0</strong> means the combination works <em>better</em> than the sum of the parts (positive synergy). <strong>b3 &lt; 0</strong> means the combination works <em>worse</em> than expected (antagonism).</p>
  <p>We report P(b3 &gt; 0) as the posterior probability of synergy. This is defined on the log-odds scale, which avoids artifacts from the nonlinearity of the logistic link function.</p>

  <h3 class="text-lg font-semibold">Glossary</h3>
  <dl class="space-y-2">
    <dt class="font-medium">ARR (Absolute Risk Reduction)</dt>
    <dd class="ml-4">The difference in success probabilities between treatment and comparator arms. Positive values mean the treatment arm has more successes.</dd>
    <dt class="font-medium">NNT (Number Needed to Treat)</dt>
    <dd class="ml-4">The number of patients you would need to treat to expect one additional success. NNT = 1/ARR. Lower NNT means a larger treatment effect.</dd>
  </dl>
</div>
